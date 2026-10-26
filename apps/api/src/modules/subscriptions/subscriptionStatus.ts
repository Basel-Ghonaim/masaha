import { daysFrom } from '@masaha/shared/core';
import type { SubscriptionStatus } from '@masaha/shared/subscriptions';

// A subscription's status (docs/architecture/data-model.md › Subscription status): pure, on the
// attendance the database function `subscription_usage` counts, and the Gaza date of today.

/** What the status reads of a subscription: its dates, its totals and whether it was ended early. */
export interface StatusTerms {
  startsOn: string | null;
  endsOn: string | null;
  totalDays: number | null;
  totalHours: number | null;
  ended: boolean;
}

/** What the status reads of its attendance. */
export interface StatusUsage {
  daysUsed: number;
  minutesUsed: number;
}

/** How many days ahead it ends, or days a subscription lasts, at most, to be ending soon by date. */
const WEEK_DAYS = 7;
/** The share of a total left at which it is ending soon. */
const ENDING_SHARE = 0.2;

/** Whether a total is left at no more than its ending share. */
const nearlyUsed = (total: number, used: number) => total - used <= total * ENDING_SHARE;

/**
 * The status, in this order: ended early → `EXPIRED`; a start after today → `UPCOMING`; its end
 * passed, or a total used up → `EXPIRED`; ending soon by whichever comes first — at most seven days
 * to its end (a subscription of at most seven days by its dates, on its last day only), or at most
 * 20 % of a total left → `ENDING_SOON`; else `ACTIVE`, with no end and no total until it is ended.
 */
export function subscriptionStatus(
  terms: StatusTerms,
  usage: StatusUsage,
  today: string,
): SubscriptionStatus {
  const { startsOn, endsOn, totalDays, totalHours } = terms;
  const totalMinutes = totalHours === null ? null : totalHours * 60;
  if (terms.ended) return 'EXPIRED';
  if (startsOn !== null && startsOn > today) return 'UPCOMING';
  if (
    (endsOn !== null && endsOn < today) ||
    (totalDays !== null && usage.daysUsed >= totalDays) ||
    (totalMinutes !== null && usage.minutesUsed >= totalMinutes)
  ) {
    return 'EXPIRED';
  }

  const short = startsOn !== null && endsOn !== null && daysFrom(startsOn, endsOn) + 1 <= WEEK_DAYS;
  const endingByDate =
    endsOn !== null && (short ? endsOn === today : daysFrom(today, endsOn) <= WEEK_DAYS);
  if (
    endingByDate ||
    (totalDays !== null && nearlyUsed(totalDays, usage.daysUsed)) ||
    (totalMinutes !== null && nearlyUsed(totalMinutes, usage.minutesUsed))
  ) {
    return 'ENDING_SOON';
  }
  return 'ACTIVE';
}
