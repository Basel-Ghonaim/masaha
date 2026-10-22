import type { DomainErrorCode } from '@masaha/shared/core';
import type { SubscriptionProgress, SubscriptionState } from '@masaha/shared/subscriptions';

import type { Now } from './subscriptions.repository.ts';

// A subscriber's check-in against the subscription's dates and limits (docs/architecture/data-model.md
// › Subscription limits): pure, on the attendance `subscription_usage` counts. They warn, never refuse.

/**
 * A check-in's own part of the attendance: its Gaza day, its minutes (open: none), and whether
 * another check-in of the subscription shares that day.
 */
export interface OwnAttendance {
  day: string;
  minutes: number | null;
  dayShared: boolean;
}

/**
 * The attendance as it was before this check-in (a retry's warnings, S7): its day left out unless
 * another check-in shares it, and its minutes, from the totals and, on their days, the week's and
 * today's.
 */
export function progressWithout(
  progress: SubscriptionProgress,
  own: OwnAttendance,
  { today, weekStart }: Now,
): SubscriptionProgress {
  const newDay = own.dayShared ? 0 : 1;
  const minutes = own.minutes ?? 0;
  const thisWeek = own.day >= weekStart && own.day <= today;
  return {
    daysUsed: progress.daysUsed - newDay,
    daysThisWeek: progress.daysThisWeek - (thisWeek ? newDay : 0),
    minutesUsed: progress.minutesUsed - minutes,
    minutesToday: progress.minutesToday - (own.day === today ? minutes : 0),
  };
}

/**
 * What a check-in on the subscription warns of, in this order: not started (`UPCOMING`) or expired;
 * this week's days used up, unless today is counted already (a check-in today uses no new day); and
 * today's hours used up. Each limit warns at its bound.
 */
export function subscriptionWarnings(
  { status, daysPerWeek, hoursPerDay, progress }: SubscriptionState,
  { checkedInToday }: { checkedInToday: boolean },
): DomainErrorCode[] {
  const warnings: DomainErrorCode[] = [];
  if (status === 'UPCOMING') warnings.push('SUBSCRIPTION_NOT_STARTED');
  if (status === 'EXPIRED') warnings.push('SUBSCRIPTION_EXPIRED');
  if (daysPerWeek !== null && !checkedInToday && progress.daysThisWeek >= daysPerWeek) {
    warnings.push('DAYS_PER_WEEK_USED');
  }
  if (hoursPerDay !== null && progress.minutesToday >= hoursPerDay * 60) {
    warnings.push('HOURS_PER_DAY_USED');
  }
  return warnings;
}
