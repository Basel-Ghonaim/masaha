import type { Language } from '@shared/copy';

// Western digits and the Gregorian calendar in both languages (docs/frontend/localisation.md ›
// Formatting); a month is read at its first day's UTC midnight and said in UTC, so the browser's zone
// never moves it.
const LOCALES: Record<Language, string> = { ar: 'ar-u-nu-latn', en: 'en-GB' };

const firstDayOf = (month: string) => new Date(`${month}-01T00:00:00.000Z`);

/** A month (`YYYY-MM`) with its year: «أكتوبر 2026», "October 2026". */
export function monthLabel(month: string, language: Language): string {
  return new Intl.DateTimeFormat(LOCALES[language], {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(firstDayOf(month));
}

/** A month's short name, a chart's tick: «أكتوبر», "Oct". */
export function monthTick(month: string, language: Language): string {
  return new Intl.DateTimeFormat(LOCALES[language], {
    month: 'short',
    timeZone: 'UTC',
  }).format(firstDayOf(month));
}
