import type { Announcement } from '@masaha/shared/announcements';

/**
 * An announcement's text in the interface's language: the English one in English when there is one;
 * else the Arabic, marked as Arabic for the English interface (DI-27).
 */
export function textOf(
  { textAr, textEn }: Pick<Announcement, 'textAr' | 'textEn'>,
  language: 'ar' | 'en',
): { text: string; lang?: 'ar'; dir?: 'rtl' } {
  if (language === 'ar') return { text: textAr };
  if (textEn !== null) return { text: textEn };
  return { text: textAr, lang: 'ar', dir: 'rtl' };
}
