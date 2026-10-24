import type { ItemPayment, PaymentItem, PaymentRow, VisitPayment } from '@masaha/shared/payments';

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

/** A payment as the payments list shows it, with the names its item, customer and people have. */
export function toPaymentRow(
  row: ItemPaymentRow,
  names: {
    item: PaymentItem;
    customer: { id: number; name: string } | null;
    recordedBy: { id: number; name: string };
    voidedBy: { id: number; name: string } | null;
  },
): PaymentRow {
  const { voidedAt, voidReason } = row;
  return {
    id: row.id,
    amountAgorot: row.amountAgorot,
    method: row.method,
    note: row.note,
    receivedAt: row.receivedAt.toISOString(),
    item: names.item,
    customer: names.customer,
    recordedBy: names.recordedBy,
    voided:
      voidedAt && names.voidedBy && voidReason !== null
        ? { at: voidedAt.toISOString(), by: names.voidedBy, reason: voidReason }
        : null,
  };
}
