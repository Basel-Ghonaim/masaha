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
