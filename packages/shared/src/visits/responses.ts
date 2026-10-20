import type { VISIT_ROUNDINGS } from '../space-settings/index.ts';
import type { PRICE_AUDIENCES } from '../spaces/index.ts';

// The answers of the front desk's visit endpoints (docs/api/api-contract.md §5, Front desk
// (managed)).

export type VisitRounding = (typeof VISIT_ROUNDINGS)[number];

/** A closed visit's charge, as stored at its check-out. */
export interface VisitCharge {
  amountAgorot: number;
  /** The rounding in force at the check-out; `null` for a typed charge or a day price alone. */
  roundingRule: VisitRounding | null;
  roundingMinutes: number | null;
  /** Whether the day-price cap cut it; `null` when it was not computed from an hour rate. */
  capApplied: boolean | null;
  /** Who typed it at the desk, with why; `null` when it was computed. */
  typedById: number | null;
  reason: string | null;
}

/** A visit as the desk sees it: who, at which rates, since when, and once closed its charge. */
export interface DeskVisit {
  id: number;
  visitorName: string | null;
  /** Set when the visit is a customer's, or was left unpaid with a phone. */
  customer: { id: number; name: string; phone: string | null } | null;
  audience: (typeof PRICE_AUDIENCES)[number];
  shiftId: number | null;
  /** Copied at check-in; `null` where the space had no such price. */
  hourRateAgorot: number | null;
  dayRateAgorot: number | null;
  checkedInAt: string;
  checkedOutAt: string | null;
  checkoutMethod: 'MANUAL' | 'AUTO' | null;
  charge: VisitCharge | null;
}

/** A visit's hour and day rates, in agorot; `null` where there is no such price. */
export interface Rates {
  hourAgorot: number | null;
  dayAgorot: number | null;
}
