import type { FieldErrors } from '@masaha/shared/core';

const DAY_MS = 86_400_000;

/** How far back a start may be (a closure posted late), and how far ahead. */
export const START_MAX_DAYS_BACK = 30;
export const START_MAX_DAYS_AHEAD = 365;
/** The longest an announcement with an end may run. */
export const PERIOD_MAX_DAYS = 365;

/**
 * What is wrong with an announcement's period at `now`, on its fields, or `null`: a start within 30
 * days back and 365 ahead; an end after now (ending one is `…/end`), and at most 365 days after the
 * start. A post checks both; an edit checks only what it changes against now and the window, and the
 * merged end against the merged start, so an ended announcement's text can still be edited.
 */
export function periodErrors(
  { startsAt, endsAt }: { startsAt: Date; endsAt: Date | null },
  now: Date,
  mode: 'create' | 'edit',
  changed: { startsAt: boolean; endsAt: boolean } = { startsAt: true, endsAt: true },
): FieldErrors | null {
  const checks = mode === 'create' ? { startsAt: true, endsAt: true } : changed;
  const errors: FieldErrors = {};
  const offset = (date: Date) => (date.getTime() - now.getTime()) / DAY_MS;

  if (checks.startsAt) {
    const days = offset(startsAt);
    if (days < -START_MAX_DAYS_BACK || days > START_MAX_DAYS_AHEAD) {
      errors.startsAt = ['out_of_range'];
    }
  }
  if (endsAt !== null && (checks.startsAt || checks.endsAt)) {
    const tooLong = endsAt.getTime() - startsAt.getTime() > PERIOD_MAX_DAYS * DAY_MS;
    const notAfterStart = endsAt <= startsAt;
    const notAfterNow = checks.endsAt && endsAt <= now;
    if (tooLong || notAfterStart || notAfterNow) errors.endsAt = ['out_of_range'];
  }
  return Object.keys(errors).length === 0 ? null : errors;
}
