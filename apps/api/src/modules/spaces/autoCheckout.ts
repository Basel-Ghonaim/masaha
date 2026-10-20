import { gazaClockOf, gazaInstant } from '@masaha/shared/core';
import type { OpeningRange } from '@masaha/shared/spaces';

// The auto check-out's due time (docs/architecture/data-model.md › Auto check-out): pure, so the
// job decides every stay alike. The caller reads the space's week and settings as they are now.

/** The last minute of a Gaza day: every stay is due by it, so none crosses into the next. */
const LAST_MINUTE = 23 * 60 + 59;

export interface AutoCheckoutInput {
  checkedInAt: Date;
  /** The space's week, Sunday (0) to Saturday (6), `null` for a closed day; `null` without any hours. */
  week: readonly (OpeningRange | null)[] | null;
  autoCheckoutAtClosing: boolean;
  maxStayMinutes: number | null;
}

/**
 * The minute of the check-in's Gaza day a closing check-out falls at: the day's closing when the
 * check-in came before it (a range closing at midnight counts as 23:59); 23:59 without any hours,
 * on a closed day, or after that day's closing.
 */
function closingMinute(week: AutoCheckoutInput['week'], dayOfWeek: number, minute: number) {
  const day = week?.[dayOfWeek] ?? null;
  if (!day || minute >= day.closesMinute) return LAST_MINUTE;
  return Math.min(day.closesMinute, LAST_MINUTE);
}

/**
 * When a stay is closed by itself: the earliest of the check-in day's closing (when the space checks
 * out at closing), the end of the stay limit (when it has one) and 23:59 of the check-in's Gaza day,
 * always; never before the check-in.
 */
export function autoCheckoutDue({
  checkedInAt,
  week,
  autoCheckoutAtClosing,
  maxStayMinutes,
}: AutoCheckoutInput): Date {
  const at = gazaClockOf(checkedInAt);
  const dues = [gazaInstant(at.date, LAST_MINUTE).getTime()];
  if (autoCheckoutAtClosing) {
    dues.push(gazaInstant(at.date, closingMinute(week, at.dayOfWeek, at.minute)).getTime());
  }
  if (maxStayMinutes !== null) dues.push(checkedInAt.getTime() + maxStayMinutes * 60_000);
  return new Date(Math.max(Math.min(...dues), checkedInAt.getTime()));
}
