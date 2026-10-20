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

/** The owner's write-off of what a closed visit still owed (K6): when, by whom and why. */
export interface VisitWriteOff {
  at: string;
  byId: number;
  reason: string;
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
  /** Set while the visit is written off; `null` otherwise, and again once the write-off is undone. */
  writeOff: VisitWriteOff | null;
}

/** What an open visit costs now, as the desk shows it before the check-out. */
export interface VisitQuote {
  /** When it was quoted: the check-out's `checkedOutAt` that charges this. */
  at: string;
  /** `null` when the visit has no rate: its price is typed, or it closes unpriced. */
  chargeAgorot: number | null;
  billedMinutes: number;
  capApplied: boolean | null;
}

/** A visit with its quote while it is open; `null` once closed. */
export type QuotedVisit = DeskVisit & { quote: VisitQuote | null };

/** The desk's terms for visits: the rounding and the cap in force, and the rates it offers. */
export interface VisitTerms {
  rounding: { rule: VisitRounding; minutes: number | null };
  capAtDayPrice: boolean;
  /** Whether the caller may type a price where a visit has no rate. */
  mayTypePrice: boolean;
  /** With no shift first, then each of the space's shifts in its order. */
  rates: {
    shiftId: number | null;
    general: Rates;
    /** Only where the space allows student prices and they change a rate (DI-41). */
    student: Rates | null;
  }[];
}

/** A visit's hour and day rates, in agorot; `null` where there is no such price. */
export interface Rates {
  hourAgorot: number | null;
  dayAgorot: number | null;
}
