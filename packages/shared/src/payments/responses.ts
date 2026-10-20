import type { DeskVisit } from '../visits/index.ts';
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

/**
 * A visit closed by the auto check-out and not fully paid: the visit, what was paid on it, and what
 * is still owed, `null` while it has no charge (unpriced).
 */
export interface UncollectedVisit {
  visit: DeskVisit;
  paidAgorot: number;
  balanceAgorot: number | null;
}
