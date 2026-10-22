import type { DomainErrorCode } from '../core/index.ts';
import type { Customer } from '../customers/index.ts';
import type { CustomerBalance, ItemPayment, VisitPayment } from '../payments/index.ts';
import type { DeskCheckIn, SubscriptionState, SubscriptionStatus } from '../subscriptions/index.ts';
import type { DeskVisit } from '../visits/index.ts';

// The answers of the front desk's orchestrations (docs/api/api-contract.md §5, Front desk
// (managed)).

/**
 * What a check-in warns of, in `meta.warnings`, in this order; it never refuses for them. A visit's
 * only the first two; a subscriber's also the subscription's dates and limits.
 */
export const DESK_WARNINGS = [
  'SPACE_FULL',
  'OUTSIDE_OPENING_HOURS',
  'SUBSCRIPTION_NOT_STARTED',
  'SUBSCRIPTION_EXPIRED',
  'DAYS_PER_WEEK_USED',
  'HOURS_PER_DAY_USED',
] as const satisfies readonly DomainErrorCode[];
export type DeskWarning = (typeof DESK_WARNINGS)[number];

/**
 * A subscriber's check-out: the check-in, closed, with what was paid on its subscription and what it
 * still owes, as of the answer (a usage-based one's stay now counted).
 */
export type CheckInCheckOut = DeskCheckIn & { paidAgorot: number; balanceAgorot: number };

/** A visit's check-out: the visit, closed, and the payment taken at it, if any. */
export interface VisitCheckOut {
  visit: DeskVisit;
  payment: VisitPayment | null;
}

/**
 * A payment on one item: the visit it paid after its check-out, or the subscription, the other
 * `null`; the payment; and what was paid on the item and what it still owes, as of the answer (a
 * retry's too). A usage-based subscription's balance is below zero while it holds credit.
 */
export interface ReceivedPayment {
  visit: DeskVisit | null;
  subscription: SubscriptionState | null;
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
    subscriptions: SubscriptionWithMoney[];
    unpaidVisits: UnpaidVisit[];
  };

/** A subscription with what was paid on it and what it still owes, as of the answer. */
export type SubscriptionWithMoney = SubscriptionState & {
  paidAgorot: number;
  balanceAgorot: number;
};

/** A payment taken with a subscribe, and the item it was allocated to. */
export interface AllocatedPayment {
  item: { visitId: number } | { subscriptionId: number };
  payment: VisitPayment;
}

/**
 * A new subscription: it, with its money; the payments the request's amount made, in the order they
 * were allocated; and the customer's debt, all as of the answer (a retry's too).
 */
export interface NewSubscription {
  subscription: SubscriptionWithMoney;
  payments: AllocatedPayment[];
  debtAgorot: number;
}

/** One check-in of a statement; `minutes` are a closed stay's whole minutes, `null` while open. */
export interface StatementCheckIn {
  id: number;
  checkedInAt: string;
  checkedOutAt: string | null;
  checkoutMethod: 'MANUAL' | 'AUTO' | null;
  minutes: number | null;
}

/**
 * A subscription's statement, as of the answer: its state and money, its customer, every check-in
 * (the earliest first) and every payment (voided ones marked), and the renewal's proposed start
 * while it is not renewed, or who renewed it.
 */
export type SubscriptionStatement = SubscriptionWithMoney & {
  customer: { id: number; name: string; phone: string | null };
  checkIns: StatementCheckIn[];
  payments: ItemPayment[];
  renewal: { startsOn: string } | null;
  renewedById: number | null;
};
