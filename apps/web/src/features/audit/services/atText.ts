import type { Language } from '@shared/copy';

// Western digits and the Gregorian calendar in both languages (docs/frontend/localisation.md ›
// Formatting), on Gaza's clock.
const LOCALES: Record<Language, string> = { ar: 'ar-u-nu-latn', en: 'en-GB' };
const TIME_ZONE = 'Asia/Gaza';

/** A moment's time of day on Gaza's clock, `HH:MM`. */
export function timeText(iso: string, language: Language): string {
  return new Intl.DateTimeFormat(LOCALES[language], {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

/** A Gaza calendar date (`YYYY-MM-DD`) with its year: «21 أكتوبر 2026», "21 October 2026". */
export function dateText(date: string, language: Language): string {
  return new Intl.DateTimeFormat(LOCALES[language], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}

/** An entry's moment as the log's time column says it: the Gaza date with its year · the time. */
export function atText(iso: string, language: Language): string {
  const day = new Intl.DateTimeFormat(LOCALES[language], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
  return `${day} · ${timeText(iso, language)}`;
}
