import type { VisitPayment } from '@masaha/shared/payments';

import type { VisitPaymentRow } from './payments.repository.ts';

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
