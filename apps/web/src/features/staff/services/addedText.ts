import { gazaClockOf } from '@masaha/shared/core';
import type { Language } from '@shared/copy';

// Western digits and the Gregorian calendar in both languages (docs/frontend/localisation.md ›
// Formatting); the Gaza date is said in UTC, so the browser's zone never moves it.
const LOCALES: Record<Language, string> = { ar: 'ar-u-nu-latn', en: 'en-GB' };

/** When a link was made, as its Gaza date with its year: «3 سبتمبر 2026», "3 September 2026". */
export function addedText(addedAt: string, language: Language): string {
  const date = gazaClockOf(new Date(addedAt)).date;
  return new Intl.DateTimeFormat(LOCALES[language], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}
