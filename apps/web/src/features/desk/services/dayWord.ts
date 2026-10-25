import { gazaClockOf } from '@masaha/shared/core';
import type { Language } from '@shared/copy';

// Western digits and the Gregorian calendar in both languages (docs/frontend/localisation.md ›
// Formatting); days fall on Gaza's calendar.
const LOCALES: Record<Language, string> = { ar: 'ar-u-nu-latn', en: 'en-GB' };
const TIME_ZONE = 'Asia/Gaza';
const DAY_MS = 86_400_000;

/** A Gaza date (`YYYY-MM-DD`) as its UTC midnight, so two days subtract to whole days. */
const midnightOf = (date: string) => Date.parse(`${date}T00:00:00.000Z`);

/**
 * The day an instant falls on, as a row of the desk says it: «اليوم» / "today", «أمس» /
 * "yesterday", else the day and the month ("4 Oct", «4 أكتوبر»), with the year when it is not the
 * current one, all on Gaza's calendar.
 */
export function dayWord(
  instant: string,
  now: Date,
  language: Language,
  words: { today: string; yesterday: string },
): string {
  const date = new Date(instant);
  const day = gazaClockOf(date).date;
  const today = gazaClockOf(now).date;
  const days = Math.round((midnightOf(today) - midnightOf(day)) / DAY_MS);
  if (days === 0) return words.today;
  if (days === 1) return words.yesterday;
  return new Intl.DateTimeFormat(LOCALES[language], {
    day: 'numeric',
    month: 'short',
    ...(day.slice(0, 4) !== today.slice(0, 4) && { year: 'numeric' }),
    timeZone: TIME_ZONE,
  }).format(date);
}
