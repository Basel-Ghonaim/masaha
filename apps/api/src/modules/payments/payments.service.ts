import type { PaginationQuery } from '@masaha/shared/core';
import type {
  CustomerBalance,
  ItemPayment,
  UncollectedVisit,
  VisitPayment,
} from '@masaha/shared/payments';

import type { Tx } from '../../db/index.ts';
import { toSkip } from '../../shared/http/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import { calendarOf } from '../subscriptions/index.ts';
import type { VisitsService } from '../visits/index.ts';
import { balanceOf } from './balance.ts';
import { toItemPayment, toVisitPayment } from './payments.mapper.ts';
import {
  createPaymentsRepository,
  type ItemBalanceRow,
  type NewPayment,
} from './payments.repository.ts';

/** An item a customer may owe on, with what is still owed: `null` while it has no due. */
export type ItemBalance = ItemBalanceRow & { balanceAgorot: number | null };

interface Dependencies {
  audit: AuditWriter;
  visits: VisitsService;
}

/**
 * The payment ledger (ADR 0010; docs/backend/conventions.md › The ledger's rules): a payment on a
 * visit or a subscription, the balances and the uncollected visits. The database owns the ledger's
 * rules: nothing here repeats them.
 */
export function createPaymentsService({ audit, visits }: Dependencies) {
  const repository = createPaymentsRepository();
  return {
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
