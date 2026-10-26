import { daysFrom, gazaClockOf } from '@masaha/shared/core';

/** The Gaza days a started closure covered: its first and last, both `YYYY-MM-DD`, and how many. */
export interface ClosureSpan {
  firstDay: string;
  lastDay: string;
  days: number;
}

/**
 * The days a started closure (`startsAt` at or before `now`) covered, by Gaza's calendar
 * (docs/architecture/data-model.md › Derived values): from its start's day to the day of its last
 * instant — `endsAt` less a millisecond once it has ended, so an end at midnight covers the day
 * before; `now` while it runs.
 */
export function closureSpan(
  { startsAt, endsAt }: { startsAt: Date; endsAt: Date | null },
  now: Date,
): ClosureSpan {
  const lastInstant =
    endsAt !== null && endsAt.getTime() <= now.getTime() ? new Date(endsAt.getTime() - 1) : now;
  const firstDay = gazaClockOf(startsAt).date;
  const lastDay = gazaClockOf(lastInstant).date;
  return { firstDay, lastDay, days: daysFrom(firstDay, lastDay) + 1 };
}
