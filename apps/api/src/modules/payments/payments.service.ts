import type { PaginationQuery } from '@masaha/shared/core';
import type {
  CustomerBalance,
  ItemPayment,
  PaymentRow,
  PaymentsQuery,
  PaymentTotals,
  UncollectedVisit,
  VisitPayment,
} from '@masaha/shared/payments';

import type { Tx } from '../../db/index.ts';
import { can, type Actor, type LoadedSpace } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import { toSkip } from '../../shared/http/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import type { CustomersService } from '../customers/index.ts';
import { calendarOf, type SubscriptionsService } from '../subscriptions/index.ts';
import type { UsersService } from '../users/index.ts';
import type { VisitsService } from '../visits/index.ts';
import { balanceOf } from './balance.ts';
import { toItemPayment, toPaymentRow, toVisitPayment } from './payments.mapper.ts';
import { paymentsWindow } from './paymentsWindow.ts';
import {
  createPaymentsRepository,
  type BalancePageRow,
  type BalanceTotals,
  type CollectionsRow,
  type IncomeTotals,
  type IncomeWindow,
  type ItemBalanceRow,
  type ItemPaymentRow,
  type NewPayment,
  type UncollectedTotals,
  type VisitPaymentRow,
} from './payments.repository.ts';

/** An item a customer may owe on, with what is still owed: `null` while it has no due. */
export type ItemBalance = ItemBalanceRow & { balanceAgorot: number | null };

/** The item a payment settles: its visit or its subscription, exactly one (the ledger's `CHECK`). */
function itemOf({
  visitId,
  subscriptionId,
}: Pick<VisitPaymentRow, 'visitId' | 'subscriptionId'>):
  { visitId: number } | { subscriptionId: number } {
  if (visitId !== null) return { visitId };
  if (subscriptionId !== null) return { subscriptionId };
  throw new Error('A payment settles exactly one item.');
}

interface Dependencies {
  audit: AuditWriter;
  visits: VisitsService;
  /** The names of who recorded and voided a payment. */
  users: UsersService;
  /** The names of a subscription's customer. */
  customers: CustomersService;
  /** The names of a payment's subscription. */
  subscriptions: SubscriptionsService;
  /** The one clock (conventions §11): today's payments. */
  now: () => Date;
}

/** The ids of these rows, each once, `null`s left out. */
const idsOf = (ids: readonly (number | null)[]) => [
  ...new Set(ids.filter((id): id is number => id !== null)),
];

/**
 * The payment ledger (ADR 0010; docs/backend/conventions.md › The ledger's rules): a payment on a
 * visit or a subscription, the balances and the uncollected visits. The database owns the ledger's
 * rules: nothing here repeats them.
 */
export function createPaymentsService({
  audit,
  visits,
  users,
  customers,
  subscriptions,
  now,
}: Dependencies) {
  const repository = createPaymentsRepository();

  /**
   * These payments of the space as the payments list shows them, in their order: each named by its
   * item (a visit's visitor, a subscription's name), its customer (the visit's, or the
   * subscription's), who recorded it and who voided it. Set-based: the visits, the subscriptions and
   * their customers, and the people, in parallel. A name missing is a bug.
   */
  async function rowsOf(
    spaceId: number,
    rows: readonly ItemPaymentRow[],
    tx?: Tx,
  ): Promise<PaymentRow[]> {
    if (rows.length === 0) return [];
    const [deskVisits, { subscriptionNames, customerNames }, people] = await Promise.all([
      visits.deskVisitsOf(spaceId, idsOf(rows.map(({ visitId }) => visitId)), tx),
      subscriptions
        .namesOf(spaceId, idsOf(rows.map(({ subscriptionId }) => subscriptionId)), tx)
        .then(async (subscriptionNames) => ({
          subscriptionNames,
          customerNames: await customers.namesOf(
            spaceId,
            idsOf([...subscriptionNames.values()].map(({ customerId }) => customerId)),
            tx,
          ),
        })),
      users
        .namesFor(
          idsOf(rows.flatMap(({ recordedById, voidedById }) => [recordedById, voidedById])),
          tx,
        )
        .then((names) => new Map(names.map(({ id, name }) => [id, name]))),
    ]);
    const person = (id: number) => {
      const name = people.get(id);
      if (name === undefined) throw new Error(`The user ${String(id)} has no name.`);
      return { id, name };
    };
    return rows.map((row) => {
      const { item, customer } = (() => {
        if (row.visitId !== null) {
          const visit = deskVisits.get(row.visitId);
          if (!visit) throw new Error(`The visit ${String(row.visitId)} is missing.`);
          return {
            item: { kind: 'VISIT' as const, id: visit.id, visitorName: visit.visitorName },
            customer: visit.customer && { id: visit.customer.id, name: visit.customer.name },
          };
        }
        const { subscriptionId } = row;
        if (subscriptionId === null) throw new Error('A payment settles exactly one item.');
        const subscription = subscriptionNames.get(subscriptionId);
        const customerName = subscription && customerNames.get(subscription.customerId);
        if (!subscription || customerName === undefined) {
          throw new Error(`The subscription ${String(subscriptionId)} is missing.`);
        }
        return {
          item: { kind: 'SUBSCRIPTION' as const, id: subscriptionId, name: subscription.name },
          customer: { id: subscription.customerId, name: customerName },
        };
      })();
      return toPaymentRow(row, {
        item,
        customer,
        recordedBy: person(row.recordedById),
        voidedBy: row.voidedById === null ? null : person(row.voidedById),
      });
    });
  }

  return {
    rowsOf,

    /**
     * A page of the space's payments and the totals of its whole filter (docs/api/api-contract.md ›
     * Front desk (managed)), decided before any query: the owner (`payments.read`) reads every
     * payment, by the query's range of Gaza days (today without one) and filters; anyone else of the
     * staff reads their own of today, and a range or `recordedById` from them is `forbidden`. The page,
     * its count and the totals in parallel, read without a lock; the rows named (`rowsOf`).
     */
    async page(
      actor: Actor,
      space: LoadedSpace,
      query: PaymentsQuery,
    ): Promise<{ rows: PaymentRow[]; total: number; totals: PaymentTotals }> {
      const mayReadAll = can(actor, 'payments.read', { links: space.links });
      if (
        !mayReadAll &&
        (query.from !== undefined || query.to !== undefined || query.recordedById !== undefined)
      ) {
        throw AppError.forbidden();
      }
      const filter = {
        spaceId: space.id,
        ...paymentsWindow(mayReadAll ? query : {}, now()),
        ...(mayReadAll
          ? query.recordedById !== undefined && { recordedById: query.recordedById }
          : { recordedById: actor.id }),
        ...(query.method !== undefined && { method: query.method }),
        ...(query.kind !== undefined && { kind: query.kind }),
      };
      const [rows, total, totals] = await Promise.all([
        repository.page(filter, query.voided, { skip: toSkip(query), take: query.limit }),
        repository.count(filter, query.voided),
        repository.totals(filter),
      ]);
      return { rows: await rowsOf(space.id, rows), total, totals };
    },

    /**
     * The space's payment, voided or not, its row locked (`FOR UPDATE`) in the caller's transaction,
     * so two voids of it decide in turn; `null` when the space has none with this id.
     */
    lockIn(spaceId: number, paymentId: number, tx: Tx): Promise<ItemPaymentRow | null> {
      return repository.lockIn(spaceId, paymentId, tx);
    },

    /**
     * Voids a locked payment of the space, not voided yet, in the caller's transaction: its void's
     * columns only (the change trigger refuses a written-off visit's, `payments_visit_written_off`);
     * audited `payment.voided` with its item, amount, method and reason; answered as the list shows
     * it. Nothing else is rewritten: every balance leaves voided payments out on read.
     */
    async void(
      {
        spaceId,
        row,
        at,
        byId,
        reason,
      }: { spaceId: number; row: ItemPaymentRow; at: Date; byId: number; reason: string },
      tx: Tx,
    ): Promise<PaymentRow> {
      const voided = await repository.void(row.id, { at, byId, reason }, tx);
      await audit(
        {
          actorId: byId,
          action: 'payment.voided',
          entityType: 'payment',
          entityId: row.id,
          spaceId,
          after: { ...itemOf(row), amountAgorot: row.amountAgorot, method: row.method, reason },
        },
        tx,
      );
      const [answered] = await rowsOf(spaceId, [voided], tx);
      if (!answered) throw new Error(`The payment ${String(row.id)} was not answered.`);
      return answered;
    },

    /**
     * The space's payment recorded with this idempotency key, with the item it settles (a visit or a
     * subscription, the other `null`), or `null`: a retried request's payment.
     */
    async findByKey(
      spaceId: number,
      key: string,
      tx: Tx,
    ): Promise<{
      visitId: number | null;
      subscriptionId: number | null;
      payment: VisitPayment;
    } | null> {
      const row = await repository.findByKey(spaceId, key, tx);
      return (
        row && {
          visitId: row.visitId,
          subscriptionId: row.subscriptionId,
          payment: toVisitPayment(row),
        }
      );
    },

    /**
     * The space's payments recorded with these keys, in the keys' order, each with its item (a visit
     * or a subscription); a key that recorded none is left out. One query: a renewal's retry.
     */
    async findByKeys(
      spaceId: number,
      keys: readonly string[],
      tx: Tx,
    ): Promise<
      { item: { visitId: number } | { subscriptionId: number }; payment: VisitPayment }[]
    > {
      const rows = new Map(
        (await repository.findByKeys(spaceId, keys, tx)).map((row) => [row.idempotencyKey, row]),
      );
      return keys.flatMap((key) => {
        const row = rows.get(key);
        if (!row) return [];
        return [{ item: itemOf(row), payment: toVisitPayment(row) }];
      });
    },

    /**
     * A page of the space's uncollected visits (data model › Uncollected visits; conventions §9,
     * composed reads): this ledger pages them in one query over the visits and their non-voided
     * payments, the settled ones (balance ≤ 0) left out and the unpriced ones kept; `visits` then
     * answers those visits as the desk sees them.
     */
    async uncollectedIn(
      spaceId: number,
      query: PaginationQuery,
    ): Promise<{ rows: UncollectedVisit[]; total: number }> {
      const { rows, total } = await repository.uncollectedPage(spaceId, {
        skip: toSkip(query),
        take: query.limit,
      });
      const deskVisits = await visits.deskVisitsOf(
        spaceId,
        rows.map(({ id }) => id),
      );
      return {
        rows: rows.flatMap(({ id, paidAgorot }) => {
          const visit = deskVisits.get(id);
          return visit
            ? [
                {
                  visit,
                  paidAgorot,
                  balanceAgorot: balanceOf(visit.charge?.amountAgorot ?? null, paidAgorot),
                },
              ]
            : [];
        }),
        total,
      };
    },

    /**
     * What was paid on this visit of the space and what is still owed, in the caller's transaction
     * (under the visit's lock, so it is what the ledger checks against); `balanceAgorot` is `null`
     * for a visit with no charge.
     */
    async balanceOfVisit(
      spaceId: number,
      { id, chargeAgorot }: { id: number; chargeAgorot: number | null },
      tx: Tx,
    ): Promise<{ paidAgorot: number; balanceAgorot: number | null }> {
      const paidAgorot = (await repository.paidFor(spaceId, [id], tx)).get(id) ?? 0;
      return { paidAgorot, balanceAgorot: balanceOf(chargeAgorot, paidAgorot) };
    },

    /**
     * The debt and the credit of each of these customers of the space at `at`, by id, in one query
     * (data model › Customer debt): computed in the database, never by reading the payments here.
     */
    customerBalances(
      spaceId: number,
      customerIds: readonly number[],
      at: Date,
      tx?: Tx,
    ): Promise<Map<number, CustomerBalance>> {
      return repository.customerBalances(spaceId, customerIds, calendarOf(at), tx);
    },

    /** The ids of the space's customers who owe, or are in credit, at `at`: the list's filter. */
    customerIdsByPayment(spaceId: number, state: 'OWES' | 'CREDIT', at: Date): Promise<number[]> {
      return repository.customerIdsByPayment(spaceId, state, calendarOf(at));
    },

    /**
     * A page of the space's customers who owe, or who are in credit, at `at`, by the one balance
     * rule (an archived customer's kept): the largest first, then by customer id; who owes with the
     * item still owing made first. In the caller's snapshot when given.
     */
    balancesPage(
      spaceId: number,
      state: 'OWES' | 'CREDIT',
      at: Date,
      { page, limit }: PaginationQuery,
      tx?: Tx,
    ): Promise<{ rows: BalancePageRow[]; total: number }> {
      return repository.balancesPage(
        spaceId,
        state,
        calendarOf(at),
        { skip: toSkip({ page, limit }), take: limit },
        tx,
      );
    },

    /**
     * The space's balances totalled at `at`: what is owed and by how many customers, what is held
     * in credit and by how many (Finance's totals; the owner's overview counts who owe).
     */
    balanceTotals(spaceId: number, at: Date, tx?: Tx): Promise<BalanceTotals> {
      return repository.balanceTotals(spaceId, calendarOf(at), tx);
    },

    /** The space's uncollected visits counted: all, what the priced ones owe, the unpriced apart. */
    uncollectedTotals(spaceId: number, tx?: Tx): Promise<UncollectedTotals> {
      return repository.uncollectedTotals(spaceId, tx);
    },

    /**
     * What the space received in each of these windows, the payments not voided, by the kind of
     * item they paid, in the windows' order (Finance's income; data model › Income). One statement;
     * in the caller's snapshot when given.
     */
    incomeIn(spaceId: number, windows: readonly IncomeWindow[], tx?: Tx): Promise<IncomeTotals[]> {
      return repository.incomeIn(spaceId, windows, tx);
    },

    /** When the space received its first payment not voided, or `null`. */
    firstReceivedAt(spaceId: number, tx?: Tx): Promise<Date | null> {
      return repository.firstReceivedAt(spaceId, tx);
    },

    /**
     * Each staff member's collections in the window, the payments not voided, by method; the largest
     * first (data model › Collections).
     */
    collectionsIn(
      spaceId: number,
      window: { from: Date; to: Date },
      tx?: Tx,
    ): Promise<CollectionsRow[]> {
      return repository.collectionsIn(spaceId, window, tx);
    },

    /**
     * Every item of one customer of the space at `at` — subscriptions and closed visits not written
     * off — with its due, what was paid and what is still owed by the one balance rule; the oldest
     * first, a visit before a subscription made at the same instant.
     */
    async itemBalances(
      spaceId: number,
      customerId: number,
      at: Date,
      tx?: Tx,
    ): Promise<ItemBalance[]> {
      const rows = await repository.itemBalances(spaceId, customerId, calendarOf(at), tx);
      return rows.map((row) => ({
        ...row,
        balanceAgorot: balanceOf(row.dueAgorot, row.paidAgorot),
      }));
    },

    /**
     * Every payment of these visits of the space, voided ones marked, by visit, the earliest received
     * first; a visit with none is absent. One query.
     */
    async paymentsFor(
      spaceId: number,
      visitIds: readonly number[],
      tx?: Tx,
    ): Promise<Map<number, ItemPayment[]>> {
      const byVisit = new Map<number, ItemPayment[]>();
      for (const row of await repository.paymentsOfVisits(spaceId, visitIds, tx)) {
        if (row.visitId === null) continue;
        byVisit.set(row.visitId, [...(byVisit.get(row.visitId) ?? []), toItemPayment(row)]);
      }
      return byVisit;
    },

    /** Every payment of the space's subscription, voided ones marked, the earliest received first. */
    async paymentsOfSubscription(
      spaceId: number,
      subscriptionId: number,
      tx?: Tx,
    ): Promise<ItemPayment[]> {
      return (await repository.paymentsOfSubscription(spaceId, subscriptionId, tx)).map(
        toItemPayment,
      );
    },

    /**
     * Records a payment on a visit or a subscription, in the caller's transaction, audited
     * `payment.recorded` with its item; the ledger's trigger checks it against the item's due.
     */
    async record(payment: NewPayment, tx: Tx): Promise<VisitPayment> {
      const row = await repository.create(payment, tx);
      await audit(
        {
          actorId: payment.recordedById,
          action: 'payment.recorded',
          entityType: 'payment',
          entityId: row.id,
          spaceId: payment.spaceId,
          after: { ...payment.item, amountAgorot: payment.amountAgorot, method: payment.method },
        },
        tx,
      );
      return toVisitPayment(row);
    },
  };
}

export type PaymentsService = ReturnType<typeof createPaymentsService>;
