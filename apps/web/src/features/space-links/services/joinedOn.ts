import type { Language } from '@shared/copy';

// Western digits and the Gregorian calendar in both languages (docs/frontend/localisation.md ›
// Formatting); dates fall on Gaza's day.
const LOCALES: Record<Language, string> = { ar: 'ar-u-nu-latn', en: 'en-GB' };

/**
 * When an account joined, as the users lists say it: the day, the month and the year, always —
 * «انضم» is a date to tell accounts apart by, this year's too (G29.1) — on Gaza's calendar.
 */
export function joinedOn(iso: string, language: Language): string {
  return new Intl.DateTimeFormat(LOCALES[language], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Gaza',
  }).format(new Date(iso));
}
