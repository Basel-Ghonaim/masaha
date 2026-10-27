import type { PaymentRow, PaymentsMeta, PaymentTotals } from '@masaha/shared/payments';
import type { FakeAnswer } from './fakeAdapter';

/** A payment as the payments list answers it: ₪25 cash on a subscription, recorded by reception. */
export function paymentRow(change: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: 31,
    amountAgorot: 2500,
    method: 'CASH',
    note: null,
    receivedAt: '2026-10-21T07:30:00.000Z',
    item: { kind: 'SUBSCRIPTION', id: 3, name: 'Every other day' },
    customer: { id: 4, name: 'Sara Khalid' },
    recordedBy: { id: 15, name: 'Laila' },
    voided: null,
    ...change,
  };
}

/** The totals of a filter: nothing by default. */
export function paymentTotals(change: Partial<PaymentTotals> = {}): PaymentTotals {
  return {
    count: 0,
    receivedAgorot: 0,
    byMethod: { CASH: 0, TRANSFER: 0 },
    voided: { count: 0, amountAgorot: 0 },
    ...change,
  };
}

/** A page of payments, with its pagination and the totals of the whole filter. */
export function paymentsPage(
  rows: PaymentRow[],
  totals: PaymentTotals = paymentTotals(),
  { total = rows.length, currentPage = 1 }: { total?: number; currentPage?: number } = {},
): FakeAnswer {
  const totalPages = Math.ceil(total / 20);
  const meta: PaymentsMeta = {
    currentPage,
    limit: 20,
    totalRecords: total,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    totals,
  };
  return { status: 200, data: { success: true, data: rows, meta } };
}
