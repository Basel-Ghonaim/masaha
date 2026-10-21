import type { DomainErrorCode } from '../core/index.ts';
import type { Customer } from '../customers/index.ts';
import type { CustomerBalance, ItemPayment, VisitPayment } from '../payments/index.ts';
import type { SubscriptionState, SubscriptionStatus } from '../subscriptions/index.ts';
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

/**
 * A row of the customers list: the customer, their current subscription (the one running, else the
 * next, else the last), and their debt and credit.
 */
export type CustomerRow = Customer &
  CustomerBalance & {
    current: {
      id: number;
      name: string;
      packageId: number | null;
      endsOn: string | null;
      status: SubscriptionStatus;
    } | null;
  };

/** Who of the customer is present now: an open check-in, or an open visit. */
export type CustomerPresence =
  | { kind: 'CHECK_IN'; id: number; subscriptionId: number; since: string }
  | { kind: 'VISIT'; id: number; since: string };

/** A closed visit the customer still owes on, with its payments (voided ones marked). */
export interface UnpaidVisit {
  visit: DeskVisit;
  payments: ItemPayment[];
  paidAgorot: number;
  /** `null` while the visit has no charge (unpriced). */
  balanceAgorot: number | null;
}

/**
 * The customer's file: the customer, their debt and credit, who of them is present, every
 * subscription with its status, progress and money (the latest started first), and their unpaid
 * visits (the oldest first).
 */
export type CustomerFile = { customer: Customer } & CustomerBalance & {
    present: CustomerPresence | null;
    subscriptions: (SubscriptionState & { paidAgorot: number; balanceAgorot: number })[];
    unpaidVisits: UnpaidVisit[];
  };
