import type { SUBSCRIPTION_BILLINGS } from '../packages/index.ts';
import type { PRICE_AUDIENCES } from '../spaces/index.ts';

// The answers that carry a subscription (docs/api/api-contract.md §5, Customers (managed)).

/** A subscription's status (docs/architecture/data-model.md › Subscription status), in this order. */
export const SUBSCRIPTION_STATUSES = ['UPCOMING', 'ACTIVE', 'ENDING_SOON', 'EXPIRED'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * A subscription's attendance (data model › Subscription progress): the days with any check-in, in
 * all and this week (Saturday to Friday), and the closed stays' whole minutes, in all and today.
 */
export interface SubscriptionProgress {
  daysUsed: number;
  daysThisWeek: number;
  minutesUsed: number;
  minutesToday: number;
}

/** A customer's subscription as the desk sees it: its terms, as copied or typed when it was made. */
export interface DeskSubscription {
  id: number;
  customerId: number;
  /** `null` for a custom subscription. */
  packageId: number | null;
  /** The subscription this one renews, the same customer's; `null` for a first one. */
  renewalOfId: number | null;
  name: string;
  /** Gaza calendar dates, `YYYY-MM-DD`. */
  startsOn: string | null;
  endsOn: string | null;
  totalDays: number | null;
  daysPerWeek: number | null;
  hoursPerDay: number | null;
  totalHours: number | null;
  billing: (typeof SUBSCRIPTION_BILLINGS)[number];
  /** The whole price when `FIXED`; otherwise the rate per hour or per day. */
  priceAgorot: number;
  audience: (typeof PRICE_AUDIENCES)[number];
  shiftId: number | null;
  /** Set when its price was typed at the desk: by whom, and why. */
  priceTyped: { byId: number; reason: string } | null;
  /** Set when it was ended early: when, and by whom. */
  ended: { at: string; byId: number } | null;
}

/** A subscription with its status, its progress and its amount due, as of the answer. */
export type SubscriptionState = DeskSubscription & {
  status: SubscriptionStatus;
  progress: SubscriptionProgress;
  dueAgorot: number;
};

/** A subscriber's check-in: its customer, its subscription's state as of the answer, its times. */
export interface DeskCheckIn {
  id: number;
  customer: { id: number; name: string; phone: string | null };
  subscription: SubscriptionState;
  checkedInAt: string;
  checkedOutAt: string | null;
  checkoutMethod: 'MANUAL' | 'AUTO' | null;
}
