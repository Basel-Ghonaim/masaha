import type { VisitPayment } from '@masaha/shared/payments';

import type { Tx } from '../../db/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import { toVisitPayment } from './payments.mapper.ts';
import { createPaymentsRepository, type NewVisitPayment } from './payments.repository.ts';

interface Dependencies {
  audit: AuditWriter;
}

/**
 * The payment ledger (ADR 0010; docs/backend/conventions.md › The ledger's rules). So far a visit's
 * payment, taken at its check-out. The database owns the ledger's rules: nothing here repeats them.
 */
export function createPaymentsService({ audit }: Dependencies) {
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
