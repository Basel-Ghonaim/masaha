import type { Language } from '@shared/copy';

// Western digits and the Gregorian calendar in both languages (docs/frontend/localisation.md ›
// Formatting).
const LOCALES: Record<Language, string> = { ar: 'ar-u-nu-latn', en: 'en-GB' };

/** A Gaza date (`YYYY-MM-DD`) as its UTC midnight, said in UTC so the browser's zone never moves it. */
const midnightOf = (date: string) => new Date(`${date}T00:00:00.000Z`);

/**
 * The period the ledger lists, as its totals line starts (DI-2): none, or today's date, is «اليوم»;
 * one day its date with its year, «21 أكتوبر 2026»; a range its two ends as the language joins them,
 * «1–21 أكتوبر 2026», "25 September – 21 October 2026".
 */
export function periodText(
  { from, to }: { from?: string; to?: string },
  language: Language,
  today: string,
  words: { today: string },
): string {
  if (from === undefined || to === undefined || (from === today && to === today)) {
    return words.today;
  }
  const format = new Intl.DateTimeFormat(LOCALES[language], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return from === to
    ? format.format(midnightOf(from))
    : format.formatRange(midnightOf(from), midnightOf(to));
}
