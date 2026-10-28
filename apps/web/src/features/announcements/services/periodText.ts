import type { Announcement } from '@masaha/shared/announcements';
import { gazaClockOf } from '@masaha/shared/core';
import type { Language } from '@shared/copy';
import { clockOf } from '@shared/lib';
import { isolate } from '@shared/localisation';

// Western digits and the Gregorian calendar in both languages (docs/frontend/localisation.md ›
// Formatting).
const LOCALES: Record<Language, string> = { ar: 'ar-u-nu-latn', en: 'en-GB' };

/** The period's words, as the catalogue gives them. */
type PeriodWords = {
  sameDay: (values: { day: string; from: string; to: string }) => string;
  range: (values: { fromDay: string; from: string; toDay: string; to: string }) => string;
  open: (values: { day: string; from: string }) => string;
};

/**
 * An announcement's period on Gaza's clock (S9), never the browser's: one day «1 أكتوبر 08:00–18:00»,
 * two days «1 أكتوبر 08:00 – 3 أكتوبر 18:00», no end «من 1 أكتوبر 08:00 · بلا نهاية»; a day says its
 * year when it is not `now`'s; each time isolated, so it reads left to right in either language.
 */
export function periodText(
  { startsAt, endsAt }: Pick<Announcement, 'startsAt' | 'endsAt'>,
  language: Language,
  now: Date,
  words: PeriodWords,
): string {
  const thisYear = gazaClockOf(now).date.slice(0, 4);
  const at = (instant: string) => {
    const { date, minute } = gazaClockOf(new Date(instant));
    // The Gaza date read at its UTC midnight and said in UTC, so no zone moves it a day.
    const day = new Intl.DateTimeFormat(LOCALES[language], {
      day: 'numeric',
      month: 'long',
      ...(date.slice(0, 4) !== thisYear && { year: 'numeric' }),
      timeZone: 'UTC',
    }).format(new Date(`${date}T00:00:00.000Z`));
    return { date, day, time: isolate(clockOf(minute)) };
  };
  const start = at(startsAt);
  if (endsAt === null) return words.open({ day: start.day, from: start.time });
  const end = at(endsAt);
  return start.date === end.date
    ? words.sameDay({ day: start.day, from: start.time, to: end.time })
    : words.range({ fromDay: start.day, from: start.time, toDay: end.day, to: end.time });
}
