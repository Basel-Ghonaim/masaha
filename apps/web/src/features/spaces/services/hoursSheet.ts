import type { OpeningRange, Shift, SpaceHours } from '@masaha/shared/spaces';

/**
 * The hours' Sheet as its form holds it (W2–W4): the simple view's two ranges — Saturday to Thursday
 * (`main`) and Friday's own, when it opens — or, customised, each day of the week, by the contract's
 * index, Sunday (0) to Saturday (6), open or closed with its own range. Every time is a minute after
 * midnight, chosen from the half-hour lists.
 */
export type HoursSheetValues = {
  custom: boolean;
  main: OpeningRange;
  fridayOpen: boolean;
  friday: OpeningRange;
  days: { open: boolean; opensMinute: number; closesMinute: number }[];
};

/** The week as a space's week runs in Gaza, Saturday first: the contract's day indexes, in order. */
export const SHOWN_DAYS = [6, 0, 1, 2, 3, 4, 5] as const;

/** Saturday to Thursday, the simple view's one line, by the contract's index. */
export const WEEKDAYS = [6, 0, 1, 2, 3, 4] as const;

export const FRIDAY = 5;

/** The template a space without hours starts from: Saturday to Thursday 08:00–18:00 (D9). */
const TEMPLATE: OpeningRange = { opensMinute: 480, closesMinute: 1080 };

const same = (first: OpeningRange | null, second: OpeningRange | null) =>
  first === null || second === null
    ? first === second
    : first.opensMinute === second.opensMinute && first.closesMinute === second.closesMinute;

const rangeOf = ({ opensMinute, closesMinute }: OpeningRange): OpeningRange => ({
  opensMinute,
  closesMinute,
});

/** The seven days of a week, each open with its range or closed, a closed one keeping `fallback`. */
const daysOf = (week: readonly (OpeningRange | null)[], fallback: OpeningRange) =>
  Array.from({ length: 7 }, (_, index) => {
    const range = week[index] ?? null;
    return range === null
      ? { open: false, ...rangeOf(fallback) }
      : { open: true, ...rangeOf(range) };
  });

/** Whether a week fits the simple view: Saturday to Thursday all open, with one range. */
function simpleWeek(week: readonly (OpeningRange | null)[]): boolean {
  const saturday = week[6] ?? null;
  return saturday !== null && WEEKDAYS.every((index) => same(week[index] ?? null, saturday));
}

/**
 * The Sheet's values for a space's hours: the simple view when Saturday to Thursday share one
 * range, whatever Friday does; else every day its own (W4). Hours never saved are the template,
 * Saturday to Thursday 08:00–18:00 and Friday closed, which the Sheet opens on without counting it a
 * change.
 */
export function sheetOf(hours: SpaceHours | null): HoursSheetValues {
  const week =
    hours?.days ?? Array.from({ length: 7 }, (_, index) => (index === FRIDAY ? null : TEMPLATE));
  const main = WEEKDAYS.map((index) => week[index] ?? null).find((range) => range !== null);
  const opening = main ?? TEMPLATE;
  const friday = week[FRIDAY] ?? null;
  return {
    custom: !simpleWeek(week),
    main: rangeOf(opening),
    fridayOpen: friday !== null,
    friday: rangeOf(friday ?? opening),
    days: daysOf(week, opening),
  };
}

/** The week the Sheet sends, by the contract's index: the simple view's ranges, or each day's. */
export function weekOf(values: HoursSheetValues): (OpeningRange | null)[] {
  if (values.custom) {
    return values.days.map((day) => (day.open ? rangeOf(day) : null));
  }
  return Array.from({ length: 7 }, (_, index) => {
    if (index === FRIDAY) return values.fridayOpen ? rangeOf(values.friday) : null;
    return rangeOf(values.main);
  });
}

/** «تخصيص الأيام»: the seven days, each as the simple view had it. */
export function toCustom(values: HoursSheetValues): HoursSheetValues {
  return { ...values, custom: true, days: daysOf(weekOf(values), values.main) };
}

/** Whether the customised days fit the simple view as they are, so going back changes nothing. */
export function fitsSimple(values: HoursSheetValues): boolean {
  return simpleWeek(weekOf(values));
}

/**
 * Back to the simple view: Saturday to Thursday take the hours of the first of them that is open
 * (Saturday first), Friday stays as it is. When the days differ the Sheet asks first (W4).
 */
export function toSimple(values: HoursSheetValues): HoursSheetValues {
  const first = WEEKDAYS.map((index) => values.days[index]).find((day) => day?.open === true);
  const friday = values.days[FRIDAY];
  return {
    ...values,
    custom: false,
    main: first === undefined ? values.main : rangeOf(first),
    fridayOpen: friday?.open ?? false,
    friday: friday === undefined ? values.friday : rangeOf(friday),
  };
}

/** Whether a week to send is the space's as saved: hours never saved are never the same. */
export function sameWeek(
  week: readonly (OpeningRange | null)[],
  hours: SpaceHours | null,
): boolean {
  return hours !== null && week.every((range, index) => same(range, hours.days[index] ?? null));
}

/**
 * The saved shifts a new week leaves outside every open day (DI-2): the server refuses such a week,
 * so the Sheet says which before anything is sent.
 */
export function shiftsOutside(
  week: readonly (OpeningRange | null)[],
  shifts: readonly Shift[],
): Shift[] {
  return shifts.filter(
    (shift) =>
      !week.some(
        (range) =>
          range !== null &&
          range.opensMinute <= shift.startsMinute &&
          shift.endsMinute <= range.closesMinute,
      ),
  );
}
