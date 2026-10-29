import { TZDate } from '@date-fns/tz';

// Gaza time (docs/backend/conventions.md §11): the calendar rules the web and the API share. They
// take the time as a parameter and never read the clock.

/** The zone Masaha runs on. */
export const GAZA_TIME_ZONE = 'Asia/Gaza';

/** An instant as Gaza's clock reads it. */
export interface GazaClock {
  /** The Gaza date, `YYYY-MM-DD`. */
  date: string;
  /** The weekday, 0 = Sunday … 6 = Saturday. */
  dayOfWeek: number;
  /** Minutes since the Gaza date's midnight, 0–1439. */
  minute: number;
}

const twoDigits = (value: number) => String(value).padStart(2, '0');

/** The Gaza date, weekday and minute of an instant. */
export function gazaClockOf(instant: Date): GazaClock {
  const gaza = new TZDate(instant.getTime(), GAZA_TIME_ZONE);
  return {
    date: `${String(gaza.getFullYear())}-${twoDigits(gaza.getMonth() + 1)}-${twoDigits(gaza.getDate())}`,
    dayOfWeek: gaza.getDay(),
    minute: gaza.getHours() * 60 + gaza.getMinutes(),
  };
}

/**
 * The instant of a minute of a Gaza date: `date` is `YYYY-MM-DD`, `minute` 0–1440, where 1440 is the
 * next day's midnight (a range that closes at midnight, docs/architecture/data-model.md).
 */
export function gazaInstant(date: string, minute: number): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(new TZDate(year, month - 1, day, 0, minute, GAZA_TIME_ZONE).getTime());
}

/** A calendar date as its UTC midnight, for day arithmetic that no zone can shift. */
function utcDay(date: string): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** The calendar date `days` after `date` (before it when negative), both `YYYY-MM-DD`. */
export function addDays(date: string, days: number): string {
  const moved = utcDay(date);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}

/** The calendar days from `from` to `to`, both `YYYY-MM-DD`: negative when `to` comes first. */
export function daysFrom(from: string, to: string): number {
  return (utcDay(to).getTime() - utcDay(from).getTime()) / 86_400_000;
}

/** The first day of `date`'s week, the Saturday on or before it (weeks run Saturday to Friday). */
export function weekStartOf(date: string): string {
  const dayOfWeek = utcDay(date).getUTCDay();
  return addDays(date, -((dayOfWeek + 1) % 7));
}

/** The calendar month of a date, `YYYY-MM` of `YYYY-MM-DD`. */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** The calendar month `months` after `month` (before it when negative), both `YYYY-MM`. */
export function addMonths(month: string, months: number): string {
  const [year = 0, monthNumber = 1] = month.split('-').map(Number);
  const index = year * 12 + monthNumber - 1 + months;
  const movedYear = Math.floor(index / 12);
  return `${String(movedYear)}-${twoDigits(index - movedYear * 12 + 1)}`;
}

/**
 * When the last `days` Gaza days start at `now`: the Gaza midnight `days − 1` days before today, so
 * today is the last of them, and they are whole Gaza days across a daylight-saving change.
 */
export function lastDaysSince(now: Date, days: number): Date {
  return gazaInstant(addDays(gazaClockOf(now).date, 1 - days), 0);
}
