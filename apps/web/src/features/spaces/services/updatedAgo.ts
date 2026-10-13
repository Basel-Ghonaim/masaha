import type { Language } from '@shared/copy';

// Western digits in both languages (docs/frontend/localisation.md › Formatting); days fall on Gaza's
// calendar.
const LOCALES: Record<Language, string> = { ar: 'ar-u-nu-latn', en: 'en' };
const TIME_ZONE = 'Asia/Gaza';
const DAY_MS = 86_400_000;

/** The day an instant falls on in Gaza, as a UTC midnight, so two days subtract to whole days. */
function gazaDay(date: Date): number {
  const [year = 0, month = 1, day = 1] = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE })
    .format(date)
    .split('-')
    .map(Number);
  return Date.UTC(year, month - 1, day);
}

/**
 * When a fact group was last saved or confirmed, as its section says it: "today", "yesterday",
 * "11 days ago", counted in Gaza's days.
 */
export function updatedAgo(iso: string, language: Language, now: Date): string {
  const days = Math.round((gazaDay(now) - gazaDay(new Date(iso))) / DAY_MS);
  return new Intl.RelativeTimeFormat(LOCALES[language], { numeric: 'auto' }).format(-days, 'day');
}
