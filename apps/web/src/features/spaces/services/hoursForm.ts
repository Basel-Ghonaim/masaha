import type { SpaceHours, UpdateSpaceHoursRequest } from '@masaha/shared/spaces';
import { clockOf } from '@shared/lib';
import { minuteOf } from './clockTime';

/**
 * The opening hours with the shifts as their form holds them: each time as typed. `days` is indexed
 * as the contract's, Sunday (0) to Saturday (6), always seven; a closed day keeps the times it opens
 * with. A new shift's `id` is `null`.
 */
export type HoursValues = {
  days: { open: boolean; opensMinute: string; closesMinute: string }[];
  shifts: {
    id: number | null;
    nameAr: string;
    nameEn: string;
    startsMinute: string;
    endsMinute: string;
  }[];
};

/** The week as a space's week runs in Gaza, Saturday first: the contract's day indexes, in order. */
export const SHOWN_DAYS = [6, 0, 1, 2, 3, 4, 5] as const;

/** Each day's name in the catalogue, by the contract's index. */
export const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const FRIDAY = 5;
const OPENS = '08:00';
const CLOSES = '18:00';

/**
 * A space's hours as their form holds them. Hours never saved are the template: Saturday to
 * Thursday 08:00–18:00, Friday closed, no shifts. A closed day opens with 08:00–18:00.
 */
export function hoursValues(hours: SpaceHours | null): HoursValues {
  if (hours === null) {
    return {
      days: DAY_KEYS.map((_, index) => ({
        open: index !== FRIDAY,
        opensMinute: OPENS,
        closesMinute: CLOSES,
      })),
      shifts: [],
    };
  }
  return {
    days: hours.days.map((day) =>
      day === null
        ? { open: false, opensMinute: OPENS, closesMinute: CLOSES }
        : {
            open: true,
            opensMinute: clockOf(day.opensMinute),
            closesMinute: clockOf(day.closesMinute),
          },
    ),
    shifts: hours.shifts.map((shift) => ({
      id: shift.id,
      nameAr: shift.nameAr,
      nameEn: shift.nameEn ?? '',
      startsMinute: clockOf(shift.startsMinute),
      endsMinute: clockOf(shift.endsMinute),
    })),
  };
}

/**
 * The hours the contract's schema reads: a closed day as `null`, each time as its minute (24:00 only
 * as an end), a saved shift with its `id` and a new one without, a blank English name as none.
 */
export function hoursInput(values: HoursValues): Record<string, unknown> {
  return {
    days: values.days.map((day) =>
      day.open
        ? {
            opensMinute: minuteOf(day.opensMinute, { end: false }),
            closesMinute: minuteOf(day.closesMinute, { end: true }),
          }
        : null,
    ),
    shifts: values.shifts.map((shift) => ({
      ...(shift.id === null ? {} : { id: shift.id }),
      nameAr: shift.nameAr,
      nameEn: shift.nameEn.trim() === '' ? null : shift.nameEn,
      startsMinute: minuteOf(shift.startsMinute, { end: false }),
      endsMinute: minuteOf(shift.endsMinute, { end: true }),
    })),
  };
}

/**
 * Whether hours to save are `hours` as they are: the same week, and the same shifts in the same
 * order (another order is a change). Hours never saved are never the same.
 */
export function sameHours(request: UpdateSpaceHoursRequest, hours: SpaceHours | null): boolean {
  if (hours === null) return false;
  const week = (days: UpdateSpaceHoursRequest['days']) =>
    days.map((day) => (day === null ? null : [day.opensMinute, day.closesMinute]));
  const shifts = (list: UpdateSpaceHoursRequest['shifts']) =>
    list.map((shift) => [
      shift.id ?? null,
      shift.nameAr,
      shift.nameEn ?? null,
      shift.startsMinute,
      shift.endsMinute,
    ]);
  return (
    JSON.stringify([week(request.days), shifts(request.shifts)]) ===
    JSON.stringify([week(hours.days), shifts(hours.shifts)])
  );
}

/** The first open day as the week is shown, Saturday first (the contract's index), or none. */
export function firstOpenDay(values: HoursValues): number | null {
  return SHOWN_DAYS.find((index) => values.days[index]?.open) ?? null;
}

/** A range's two minutes when both can be read, else none. */
function rangeOf(from: string, to: string): [number, number] | null {
  const opens = minuteOf(from, { end: false });
  const closes = minuteOf(to, { end: true });
  return typeof opens === 'number' && typeof closes === 'number' ? [opens, closes] : null;
}

/**
 * The open days, as the week is shown, whose hours do not hold the shift at `shiftIndex`: the days it
 * does not apply on. None when its times cannot be read, or when it fits no open day: that is the
 * shift's error, not a helper.
 */
export function daysNotCovering(values: HoursValues, shiftIndex: number): number[] {
  const shift = values.shifts[shiftIndex];
  const range = shift === undefined ? null : rangeOf(shift.startsMinute, shift.endsMinute);
  if (range === null) return [];
  const [starts, ends] = range;
  const open = SHOWN_DAYS.flatMap((index) => {
    const day = values.days[index];
    const hours = day?.open ? rangeOf(day.opensMinute, day.closesMinute) : null;
    return hours === null ? [] : [{ index, holds: hours[0] <= starts && ends <= hours[1] }];
  });
  if (!open.some(({ holds }) => holds)) return [];
  return open.filter(({ holds }) => !holds).map(({ index }) => index);
}
