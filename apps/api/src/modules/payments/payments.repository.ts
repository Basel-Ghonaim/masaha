import type { PaymentRequest } from '@masaha/shared/payments';

import { prisma, type Tx } from '../../db/index.ts';

const VISIT_PAYMENT = {
  id: true,
  visitId: true,
  amountAgorot: true,
  method: true,
  note: true,
  receivedAt: true,
  recordedById: true,
} as const;

/** A payment of a visit, as it is stored. */
export interface VisitPaymentRow {
  id: number;
  visitId: number | null;
  amountAgorot: number;
  method: PaymentRequest['method'];
  note: string | null;
  receivedAt: Date;
  recordedById: number;
}

/** A visit's payment to record, with its idempotency key. */
export interface NewVisitPayment extends PaymentRequest {
  spaceId: number;
  visitId: number;
  key: string;
  recordedById: number;
  receivedAt: Date;
}

/**
 * The `payments` table, the ledger of ADR 0010. The database owns its rules (append-only, voided
 * once, never above the amount due); a violation reaches the error handler, which translates it.
 */
export function createPaymentsRepository() {
  return {
    /** The space's payment recorded with this idempotency key, or `null`. */
    findByKey(spaceId: number, key: string, tx: Tx): Promise<VisitPaymentRow | null> {
      return tx.payment.findUnique({
        where: { spaceId_idempotencyKey: { spaceId, idempotencyKey: key } },
        select: VISIT_PAYMENT,
      });
    },

    /** What was paid on each of these visits of the space, voided payments left out; none is absent. */
    async paidFor(
      spaceId: number,
      visitIds: readonly number[],
      tx: Tx = prisma,
    ): Promise<Map<number, number>> {
      if (visitIds.length === 0) return new Map();
      const groups = await tx.payment.groupBy({
        by: ['visitId'],
        where: { spaceId, visitId: { in: [...visitIds] }, voidedAt: null },
        _sum: { amountAgorot: true },
      });
      return new Map(
        groups.flatMap(({ visitId, _sum }) =>
          visitId === null ? [] : [[visitId, _sum.amountAgorot ?? 0] as const],
        ),
      );
    },

    /** Inserts the payment; the insert trigger checks it against the visit's charge. */
    createForVisit(payment: NewVisitPayment, tx: Tx): Promise<VisitPaymentRow> {
      const { spaceId, visitId, key, amountAgorot, method, note, recordedById, receivedAt } =
        payment;
      return tx.payment.create({
        data: {
          spaceId,
          visitId,
          idempotencyKey: key,
          amountAgorot,
          method,
          note: note ?? null,
          recordedById,
          receivedAt,
        },
        select: VISIT_PAYMENT,
      });
    },
  };
}
