import type { OverrideDuration } from '@masaha/shared/occupancy';

const MINUTE_MS = 60_000;

/** How long each duration lasts, in minutes; `UNTIL_CLOSING` lasts until closing. */
const MINUTES = { MINUTES_30: 30, HOUR_1: 60, HOURS_2: 120 } as const;

/**
 * When an override set at `now` ends: after its duration, never past today's closing `closesAt`
 * (docs/architecture/data-model.md › Live status), so no override outlives its day.
 */
export function overrideUntil(duration: OverrideDuration, now: Date, closesAt: Date): Date {
  if (duration === 'UNTIL_CLOSING') return closesAt;
  const after = new Date(now.getTime() + MINUTES[duration] * MINUTE_MS);
  return after < closesAt ? after : closesAt;
}
