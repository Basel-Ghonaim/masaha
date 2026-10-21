import { gazaClockOf, weekStartOf } from '@masaha/shared/core';

import type { Now } from './subscriptions.repository.ts';

/**
 * The calendar days attendance is counted on at an instant: its Gaza date, and that week's Saturday
 * (data model › Subscription progress). Every read of `subscription_usage` passes them.
 */
export function calendarOf(at: Date): Now {
  const today = gazaClockOf(at).date;
  return { today, weekStart: weekStartOf(today) };
}
