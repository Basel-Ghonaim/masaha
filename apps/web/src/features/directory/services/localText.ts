/** A text shown in a page of either language: its words, marked when they are not the interface's. */
export type LocalText = { text: string; lang?: 'ar' | 'en'; dir?: 'rtl' | 'ltr' };

const filled = (text: string | null): text is string => text !== null && text.trim() !== '';

/**
 * A text the space wrote in Arabic, English or both, in the interface's language when it has one,
 * else in the other, marked with its language and direction (docs/frontend/localisation.md ›
 * Content in two languages). Neither: nothing.
 */
export function localText(
  ar: string | null,
  en: string | null,
  english: boolean,
): LocalText | null {
  if (english) {
    if (filled(en)) return { text: en };
    return filled(ar) ? { text: ar, lang: 'ar', dir: 'rtl' } : null;
  }
  if (filled(ar)) return { text: ar };
  return filled(en) ? { text: en, lang: 'en', dir: 'ltr' } : null;
}
