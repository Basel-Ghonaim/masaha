import { FINANCE_MONTHS_BACK } from '@masaha/shared/finance';
import { addDays, addMonths, gazaClockOf, gazaInstant, monthOf } from '@masaha/shared/core';

// Finance's windows (docs/features/finance.md): each a pair of instants from Gaza's calendar, so
// the SQL takes plain instants and no zone is read in the database (S1). Pure.

/** A window of instants, `to` left out. */
export interface Window {
  from: Date;
  to: Date;
}

/** An hour of a Gaza day: its window, and its weekday (0 = Sunday) and hour as Gaza's clock reads them. */
export interface HourSlot extends Window {
  weekday: number;
  hour: number;
}

/** A Gaza day, from its midnight to the next. */
export function dayWindow(date: string): Window {
  return { from: gazaInstant(date, 0), to: gazaInstant(addDays(date, 1), 0) };
}

/** A Gaza calendar month, `YYYY-MM`, from its first midnight to the next month's. */
export function monthWindow(month: string): Window {
  return { from: gazaInstant(`${month}-01`, 0), to: gazaInstant(`${addMonths(month, 1)}-01`, 0) };
}

/** The current Gaza month at `now`. */
export function currentMonth(now: Date): string {
  return monthOf(gazaClockOf(now).date);
}

/**
 * `out_of_range` for a month finance does not read at `now`: after the current Gaza month, or
 * before the 23 months before it; else `null`.
 */
export function monthError(month: string, now: Date): 'out_of_range' | null {
  const current = currentMonth(now);
  return month > current || month < addMonths(current, -FINANCE_MONTHS_BACK)
    ? 'out_of_range'
    : null;
}

/** The `count` months ending with `month`, oldest first. */
export function monthsEnding(month: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(month, i - count + 1));
}

/** The `count` Gaza days ending with `date`, oldest first. */
export function daysEnding(date: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(date, i - count + 1));
}

/** The 28 Gaza days before today, oldest first, today left out: each weekday exactly 4 times. */
export function fourWeeksBefore(now: Date): string[] {
  return daysEnding(addDays(gazaClockOf(now).date, -1), 28);
}

/**
 * Every hour of these Gaza days, from each day's midnight to the next: each labelled by Gaza's
 * clock at its start, so a daylight-saving night's day has 23 or 25 hours as Gaza counts them.
 */
export function hourSlots(dates: readonly string[]): HourSlot[] {
  return dates.flatMap((date) => {
    const { from: start, to: end } = dayWindow(date);
    const slots: HourSlot[] = [];
    for (let from = start; from < end;) {
      const to = new Date(Math.min(from.getTime() + 3_600_000, end.getTime()));
      const { dayOfWeek, minute } = gazaClockOf(from);
      slots.push({ from, to, weekday: dayOfWeek, hour: Math.floor(minute / 60) });
      from = to;
    }
    return slots;
  });
}
