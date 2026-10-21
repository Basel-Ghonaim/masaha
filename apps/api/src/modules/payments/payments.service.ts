import type { PaginationQuery } from '@masaha/shared/core';
import type {
  CustomerBalance,
  ItemPayment,
  UncollectedVisit,
  VisitPayment,
} from '@masaha/shared/payments';

import type { Tx } from '../../db/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import { calendarOf } from '../subscriptions/index.ts';
import type { VisitsService } from '../visits/index.ts';
import { balanceOf } from './balance.ts';
import { toItemPayment, toVisitPayment } from './payments.mapper.ts';
import {
  createPaymentsRepository,
  type ItemBalanceRow,
  type NewVisitPayment,
} from './payments.repository.ts';

/** An item a customer may owe on, with what is still owed: `null` while it has no due. */
export type ItemBalance = ItemBalanceRow & { balanceAgorot: number | null };

interface Dependencies {
  audit: AuditWriter;
  visits: VisitsService;
}

/**
 * The payment ledger (ADR 0010; docs/backend/conventions.md › The ledger's rules). So far a visit's
 * payment, taken at its check-out, and the uncollected visits. The database owns the ledger's rules:
 * nothing here repeats them.
 */
export function createPaymentsService({ audit, visits }: Dependencies) {
  const repository = createPaymentsRepository();
  return {
    /**
     * The space's payment recorded with this idempotency key, with the visit it settles, or `null`:
     * a retried check-out's payment.
     */
    async findByKey(
      spaceId: number,
      key: string,
      tx: Tx,
    ): Promise<{ visitId: number | null; payment: VisitPayment } | null> {
      const row = await repository.findByKey(spaceId, key, tx);
      return row && { visitId: row.visitId, payment: toVisitPayment(row) };
    },

    /**
     * A page of the space's uncollected visits (data model › Uncollected visits; conventions §9,
     * composed reads): `visits` names the ones closed by the auto check-out, with their charges;
     * this ledger sums what was paid on each, voided payments left out, and leaves out the settled
     * ones (balance ≤ 0); `visits` then pages the rest, the unpriced ones included.
     */
    async uncollectedIn(
      spaceId: number,
      query: PaginationQuery,
    ): Promise<{ rows: UncollectedVisit[]; total: number }> {
      const closed = await visits.autoClosedIn(spaceId);
      const paid = await repository.paidFor(
        spaceId,
        closed.map(({ id }) => id),
      );
      const settled = closed.flatMap(({ id, chargeAgorot }) => {
        const balance = balanceOf(chargeAgorot, paid.get(id) ?? 0);
        return balance !== null && balance <= 0 ? [id] : [];
      });
      const { rows, total } = await visits.autoClosedPage(spaceId, settled, query);
      return {
        rows: rows.map((visit) => {
          const paidAgorot = paid.get(visit.id) ?? 0;
          return {
            visit,
            paidAgorot,
            balanceAgorot: balanceOf(visit.charge?.amountAgorot ?? null, paidAgorot),
          };
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

    /** Records a visit's payment, in the caller's transaction, audited `payment.recorded`. */
    async recordForVisit(payment: NewVisitPayment, tx: Tx): Promise<VisitPayment> {
      const row = await repository.createForVisit(payment, tx);
      await audit(
        {
          actorId: payment.recordedById,
          action: 'payment.recorded',
          entityType: 'payment',
          entityId: row.id,
          spaceId: payment.spaceId,
          after: {
            visitId: payment.visitId,
            amountAgorot: payment.amountAgorot,
            method: payment.method,
          },
        },
        tx,
      );
      return toVisitPayment(row);
    },
  };
}

export type PaymentsService = ReturnType<typeof createPaymentsService>;
