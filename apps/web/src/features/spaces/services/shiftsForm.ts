import type { OpeningRange, SpaceHours, UpdateSpaceHoursRequest } from '@masaha/shared/spaces';
import { SHOWN_DAYS } from './hoursSheet';

/** One shift as the shifts' Sheet holds it: a saved one keeps its id, a new one has none. */
export type ShiftRow = {
  id: number | null;
  nameAr: string;
  nameEn: string;
  startsMinute: number;
  endsMinute: number;
};

/** The shifts' Sheet as its form holds it. */
export type ShiftsValues = { shifts: ShiftRow[] };

/** The first open day's range, Saturday first, the times a new shift starts with. */
function firstOpen(hours: SpaceHours): OpeningRange | undefined {
  return (
    SHOWN_DAYS.map((index) => hours.days[index] ?? null).find((range) => range !== null) ??
    undefined
  );
}

/** A new shift: no name yet, the first open day's hours, else 08:00–13:00. */
export function newShift(hours: SpaceHours): ShiftRow {
  const range = firstOpen(hours);
  return {
    id: null,
    nameAr: '',
    nameEn: '',
    startsMinute: range?.opensMinute ?? 480,
    endsMinute: range?.closesMinute ?? 780,
  };
}

/**
 * The Sheet's values for a space's saved hours: its shifts, or, with none, one new shift to fill in,
 * which opening the Sheet does not count as a change.
 */
export function shiftsValues(hours: SpaceHours): ShiftsValues {
  if (hours.shifts.length === 0) return { shifts: [newShift(hours)] };
  return {
    shifts: hours.shifts.map((shift) => ({
      id: shift.id,
      nameAr: shift.nameAr,
      nameEn: shift.nameEn ?? '',
      startsMinute: shift.startsMinute,
      endsMinute: shift.endsMinute,
    })),
  };
}

/**
 * What the shifts' Sheet sends, as the contract's schema reads it: the week and the evening switch
 * exactly as saved (S5: the hours and the shifts are one group, and a shifts' save leaves the hours
 * as they are), and the shifts, a saved one with its id, a blank English name as none (X1).
 */
export function shiftsInput(
  values: ShiftsValues,
  { days, worksEvenings }: Pick<SpaceHours, 'days' | 'worksEvenings'>,
): Record<string, unknown> {
  return {
    days,
    worksEvenings,
    shifts: values.shifts.map((shift) => ({
      ...(shift.id === null ? {} : { id: shift.id }),
      nameAr: shift.nameAr,
      nameEn: shift.nameEn.trim() === '' ? null : shift.nameEn,
      startsMinute: shift.startsMinute,
      endsMinute: shift.endsMinute,
    })),
  };
}

/** Whether the shifts to send are the space's as saved: the same, in the same order. */
export function sameShifts(shifts: UpdateSpaceHoursRequest['shifts'], hours: SpaceHours): boolean {
  const rows = (list: UpdateSpaceHoursRequest['shifts']) =>
    list.map((shift) => [
      shift.id ?? null,
      shift.nameAr,
      shift.nameEn ?? null,
      shift.startsMinute,
      shift.endsMinute,
    ]);
  return JSON.stringify(rows(shifts)) === JSON.stringify(rows(hours.shifts));
}

/**
 * The open days, as the week is shown, whose hours do not hold a shift: the days it does not apply
 * on, its helper (D4). None when it fits no open day: that is the shift's error, not a helper.
 */
export function daysNotCovering(
  week: readonly (OpeningRange | null)[],
  shift: Pick<ShiftRow, 'startsMinute' | 'endsMinute'>,
): number[] {
  const open = SHOWN_DAYS.flatMap((index) => {
    const range = week[index] ?? null;
    return range === null
      ? []
      : [
          {
            index,
            holds:
              range.opensMinute <= shift.startsMinute && shift.endsMinute <= range.closesMinute,
          },
        ];
  });
  if (!open.some(({ holds }) => holds)) return [];
  return open.filter(({ holds }) => !holds).map(({ index }) => index);
}
