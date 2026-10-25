import type { Language } from '@shared/copy';

// Western digits and the Gregorian calendar in both languages (docs/frontend/localisation.md ›
// Formatting).
const LOCALES: Record<Language, string> = { ar: 'ar-u-nu-latn', en: 'en-GB' };

/**
 * A Gaza calendar date (`YYYY-MM-DD`), such as a subscription's end, as its day and its month: «21
 * أكتوبر», "21 October". The date is read at its UTC midnight and said in UTC, so it is never moved
 * a day by the browser's zone.
 */
export function dayText(date: string, language: Language): string {
  return new Intl.DateTimeFormat(LOCALES[language], {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}
