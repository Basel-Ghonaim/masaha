import { gazaClockOf } from '@masaha/shared/core';
import type { Shift } from '@masaha/shared/spaces';

/** The shift whose range holds Gaza's minute at `now`, its end not included; none outside them all. */
export function currentShift(shifts: readonly Shift[], now: Date): Shift | null {
  const { minute } = gazaClockOf(now);
  return shifts.find((shift) => shift.startsMinute <= minute && minute < shift.endsMinute) ?? null;
}
