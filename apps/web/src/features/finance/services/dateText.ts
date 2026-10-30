import type { Language } from '@shared/copy';

// Western digits and the Gregorian calendar in both languages (docs/frontend/localisation.md ›
// Formatting); the date is read at its UTC midnight and said in UTC, so no zone moves it.
const LOCALES: Record<Language, string> = { ar: 'ar-u-nu-latn', en: 'en-GB' };

/** A Gaza calendar date (`YYYY-MM-DD`) with its year: «3 سبتمبر 2026», "3 September 2026". */
export function dateText(date: string, language: Language): string {
  return new Intl.DateTimeFormat(LOCALES[language], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}
