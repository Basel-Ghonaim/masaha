import type { Language } from '@shared/copy';

const LOCALES: Record<Language, string> = { ar: 'ar-u-nu-latn', en: 'en-GB' };

/** The weekdays (0 = Sunday … 6 = Saturday) in the language's week: Arabic from Saturday, English from Sunday, as the calendar. */
export function weekdaysOf(language: Language): number[] {
  return language === 'ar' ? [6, 0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6];
}

/** A weekday's name: «السبت», "Saturday". 25 October 2026 is a Sunday. */
export function weekdayName(weekday: number, language: Language): string {
  return new Intl.DateTimeFormat(LOCALES[language], { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2026, 9, 25 + weekday)),
  );
}
