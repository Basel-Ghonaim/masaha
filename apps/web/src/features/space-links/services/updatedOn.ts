import type { Language } from '@shared/copy';

// Western digits and the Gregorian calendar in both languages (docs/frontend/localisation.md ›
// Formatting); dates fall on Gaza's day.
const LOCALES: Record<Language, string> = { ar: 'ar-u-nu-latn', en: 'en-GB' };
const TIME_ZONE = 'Asia/Gaza';

const yearOf = (date: Date) =>
  new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: TIME_ZONE }).format(date);

/**
 * When a space was last updated, as its row shows it: the day and the month ("27 Sept",
 * "27 سبتمبر"), and the year too when it is not the current one, both on Gaza's calendar.
 */
export function updatedOn(iso: string, language: Language, now: Date): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(LOCALES[language], {
    day: 'numeric',
    month: 'short',
    ...(yearOf(date) !== yearOf(now) && { year: 'numeric' }),
    timeZone: TIME_ZONE,
  }).format(date);
}
