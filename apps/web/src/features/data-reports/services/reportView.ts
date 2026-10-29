import { gazaClockOf } from '@masaha/shared/core';
import type { DataReportField, DataReportStatus } from '@masaha/shared/data-reports';
import type { Catalogue, Language } from '@shared/copy';

type Words = Catalogue['dataReports'];

// Western digits and the Gregorian calendar in both languages (docs/frontend/localisation.md ›
// Formatting); days fall on Gaza's calendar.
const LOCALES: Record<Language, string> = { ar: 'ar-u-nu-latn', en: 'en-GB' };
const TIME_ZONE = 'Asia/Gaza';

/** A report's status as a badge says it: its word, and the badge's tone (DI-31). */
export type StatusView = { label: string; tone: 'info' | 'success' | 'neutral' };

const TONES: Record<DataReportStatus, StatusView['tone']> = {
  OPEN: 'info',
  RESOLVED: 'success',
  DISMISSED: 'neutral',
};

/** The field group a report names, in the interface's words. */
export function fieldLabel(field: DataReportField, words: Words['fields']): string {
  return words[field];
}

/**
 * A report's status, as its audience reads it (DI-31): the staff and the admin «جديد», the reporter
 * «قيد المراجعة»; a decision says which one it was — «تم التصحيح» `success`, «لم يُعتمد» `neutral`.
 */
export function statusView(
  status: DataReportStatus,
  words: Words['statuses'],
  audience: 'staff' | 'reporter',
): StatusView {
  return { label: words[audience][status], tone: TONES[status] };
}

/**
 * The day a report was made, on Gaza's calendar: «21 أكتوبر», with the year when it is not the
 * current one — **never the time** (DI-34, finding 150): the owner must not narrow the reporter to
 * who was present at that minute.
 */
export function reportDay(instant: string, language: Language, now: Date): string {
  const date = new Date(instant);
  const thisYear = gazaClockOf(now).date.slice(0, 4);
  return new Intl.DateTimeFormat(LOCALES[language], {
    day: 'numeric',
    month: 'long',
    ...(gazaClockOf(date).date.slice(0, 4) !== thisYear && { year: 'numeric' }),
    timeZone: TIME_ZONE,
  }).format(date);
}

/** A report's message, or the line that says the reporter wrote none (DI-35), shown muted. */
export function messageView(
  message: string | null,
  words: Pick<Words, 'noMessage'>,
): { text: string; none: boolean } {
  return message === null ? { text: words.noMessage, none: true } : { text: message, none: false };
}
