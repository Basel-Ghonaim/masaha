import type { PAYMENT_METHODS } from './requests.ts';

// The answers that carry a payment (docs/api/api-contract.md §5, Front desk (managed)).

/** A payment of a visit, as recorded. */
export interface VisitPayment {
  id: number;
  amountAgorot: number;
  method: (typeof PAYMENT_METHODS)[number];
  note: string | null;
  receivedAt: string;
  recordedById: number;
}
