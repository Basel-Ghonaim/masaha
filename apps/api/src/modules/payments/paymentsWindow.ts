import { addDays, gazaClockOf, gazaInstant } from '@masaha/shared/core';

/**
 * The instants of the payments list's range of Gaza days (docs/api/api-contract.md › Front desk
 * (managed)): from its first day's midnight to the midnight after its last, that end left out;
 * without a range, today in Gaza at `now`. A payment counts on the day it was received (ADR 0010
 * rule 5).
 */
export function paymentsWindow(
  { from, to }: { from?: string; to?: string },
  now: Date,
): { from: Date; to: Date } {
  if (from === undefined || to === undefined) {
    const today = gazaClockOf(now).date;
    return { from: gazaInstant(today, 0), to: gazaInstant(addDays(today, 1), 0) };
  }
  return { from: gazaInstant(from, 0), to: gazaInstant(addDays(to, 1), 0) };
}
