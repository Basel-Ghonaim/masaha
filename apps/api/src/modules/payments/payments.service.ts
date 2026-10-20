import type { PaginationQuery } from '@masaha/shared/core';
import type { UncollectedVisit, VisitPayment } from '@masaha/shared/payments';

import type { Tx } from '../../db/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import type { VisitsService } from '../visits/index.ts';
import { balanceOf } from './balance.ts';
import { toVisitPayment } from './payments.mapper.ts';
import { createPaymentsRepository, type NewVisitPayment } from './payments.repository.ts';

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
