import type { DomainErrorCode } from '../core/index.ts';
import type { VisitPayment } from '../payments/index.ts';
import type { DeskVisit } from '../visits/index.ts';

// The answers of the front desk's orchestrations (docs/api/api-contract.md §5, Front desk
// (managed)).

/** What a check-in warns of, in `meta.warnings`, in this order; it never refuses for them. */
export const DESK_WARNINGS = [
  'SPACE_FULL',
  'OUTSIDE_OPENING_HOURS',
] as const satisfies readonly DomainErrorCode[];
export type DeskWarning = (typeof DESK_WARNINGS)[number];

/** A visit's check-out: the visit, closed, and the payment taken at it, if any. */
export interface VisitCheckOut {
  visit: DeskVisit;
  payment: VisitPayment | null;
}

/**
 * A visit's payment after its check-out: the visit, the payment, and what was paid on the visit and
 * what it still owes, as of the answer (a retry's too).
 */
export interface ReceivedPayment {
  visit: DeskVisit;
  payment: VisitPayment;
  paidAgorot: number;
  balanceAgorot: number;
}
