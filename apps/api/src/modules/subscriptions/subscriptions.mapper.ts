import type { SubscriptionState } from '@masaha/shared/subscriptions';

import { subscriptionStatus } from './subscriptionStatus.ts';
import type { SubscriptionStateRow } from './subscriptions.repository.ts';

/** A `@db.Date` as its calendar date, read at UTC, never through a zone (conventions §11). */
const calendarDate = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null;

/** A subscription's row and attendance, as the contract's `SubscriptionState` shows it on `today`. */
export function toSubscriptionState(row: SubscriptionStateRow, today: string): SubscriptionState {
  const startsOn = calendarDate(row.starts_on);
  const endsOn = calendarDate(row.ends_on);
  const progress = {
    daysUsed: row.days_used,
    daysThisWeek: row.days_this_week,
    minutesUsed: row.minutes_used,
    minutesToday: row.minutes_today,
  };
  return {
    id: row.id,
    customerId: row.customer_id,
    packageId: row.package_id,
    renewalOfId: row.renewal_of_id,
    name: row.name,
    startsOn,
    endsOn,
    totalDays: row.total_days,
    daysPerWeek: row.days_per_week,
    hoursPerDay: row.hours_per_day,
    totalHours: row.total_hours,
    billing: row.billing,
    priceAgorot: row.price_agorot,
    audience: row.audience,
    shiftId: row.shift_id,
    priceTyped:
      row.price_set_by_id !== null && row.price_reason !== null
        ? { byId: row.price_set_by_id, reason: row.price_reason }
        : null,
    ended:
      row.ended_at && row.ended_by_id !== null
        ? { at: row.ended_at.toISOString(), byId: row.ended_by_id }
        : null,
    status: subscriptionStatus(
      {
        startsOn,
        endsOn,
        totalDays: row.total_days,
        totalHours: row.total_hours,
        ended: row.ended_at !== null,
      },
      progress,
      today,
    ),
    progress,
    dueAgorot: row.due_agorot,
  };
}
