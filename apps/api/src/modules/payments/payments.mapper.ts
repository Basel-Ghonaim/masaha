import type { ItemPayment, VisitPayment } from '@masaha/shared/payments';

import type { ItemPaymentRow, VisitPaymentRow } from './payments.repository.ts';

/** A visit's payment as the desk is answered it (docs/api/api-contract.md › Front desk (managed)). */
export function toVisitPayment(row: VisitPaymentRow): VisitPayment {
  return {
    id: row.id,
    amountAgorot: row.amountAgorot,
    method: row.method,
    note: row.note,
    receivedAt: row.receivedAt.toISOString(),
    recordedById: row.recordedById,
  };
}

/** A payment as a statement shows it, its void with it (when, by whom, why) once voided. */
export function toItemPayment(row: ItemPaymentRow): ItemPayment {
  const { voidedAt, voidedById, voidReason } = row;
  return {
    ...toVisitPayment(row),
    voided:
      voidedAt && voidedById !== null && voidReason !== null
        ? { at: voidedAt.toISOString(), byId: voidedById, reason: voidReason }
        : null,
  };
}
