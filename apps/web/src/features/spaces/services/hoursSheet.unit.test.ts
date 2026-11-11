import type { OpeningRange, Shift, SpaceHours } from '@masaha/shared/spaces';
import { describe, expect, it } from 'vitest';
import {
  fitsSimple,
  sameWeek,
  sheetOf,
  shiftsOutside,
  toCustom,
  toSimple,
  weekOf,
} from './hoursSheet';

const range = (opensMinute: number, closesMinute: number): OpeningRange => ({
  opensMinute,
  closesMinute,
});
const DAY = range(480, 1080);
// Sunday (0) to Saturday (6): Saturday to Thursday 08:00–18:00, Friday 13:00–18:00.
const WITH_FRIDAY: (OpeningRange | null)[] = [DAY, DAY, DAY, DAY, DAY, range(780, 1080), DAY];
const hours = (days: (OpeningRange | null)[], shifts: Shift[] = []): SpaceHours => ({
  days,
  shifts,
});

describe('sheetOf', () => {
  it('opens hours never saved on the template, Saturday to Thursday 08:00–18:00, Friday closed', () => {
    const values = sheetOf(null);

    expect(values.custom).toBe(false);
    expect(values.main).toEqual(DAY);
    expect(values.fridayOpen).toBe(false);
    expect(weekOf(values)).toEqual([DAY, DAY, DAY, DAY, DAY, null, DAY]);
  });

  it('opens Saturday to Thursday alike in the simple view, whatever Friday does', () => {
    const values = sheetOf(hours(WITH_FRIDAY));

    expect(values.custom).toBe(false);
    expect(values.fridayOpen).toBe(true);
    expect(values.friday).toEqual(range(780, 1080));
  });

  it('opens days that differ beyond Friday in the custom view, each day as saved', () => {
    const thursdayShort = [DAY, DAY, DAY, DAY, range(480, 840), null, DAY];
    const values = sheetOf(hours(thursdayShort));

    expect(values.custom).toBe(true);
    expect(weekOf(values)).toEqual(thursdayShort);
  });

  it('opens a week with Saturday closed in the custom view', () => {
    expect(sheetOf(hours([DAY, DAY, DAY, DAY, DAY, null, null])).custom).toBe(true);
  });
});

describe('weekOf', () => {
  it('writes the simple view by the contract’s index: Friday is 5, Saturday 6, Sunday 0', () => {
    const values = {
      ...sheetOf(null),
      main: range(540, 1200),
      fridayOpen: true,
      friday: range(780, 1200),
    };

    const week = weekOf(values);
    expect(week[5]).toEqual(range(780, 1200));
    expect(week[6]).toEqual(range(540, 1200));
    expect(week[0]).toEqual(range(540, 1200));
    expect(week).toHaveLength(7);
  });

  it('writes the custom view day by day, a closed day as none', () => {
    const values = { ...sheetOf(null), custom: true };
    values.days[2] = { open: false, opensMinute: 480, closesMinute: 1080 };

    expect(weekOf(values)).toEqual([DAY, DAY, null, DAY, DAY, null, DAY]);
  });
});

describe('toCustom and toSimple', () => {
  it('customises the simple view into seven days, each as it was', () => {
    const custom = toCustom(sheetOf(hours(WITH_FRIDAY)));

    expect(custom.custom).toBe(true);
    expect(weekOf(custom)).toEqual(WITH_FRIDAY);
  });

  it('goes back to the simple view on the first open day of Saturday to Thursday, Friday kept', () => {
    const values = sheetOf(hours([range(600, 900), DAY, DAY, DAY, DAY, range(780, 1080), null]));
    // Saturday is closed, so Sunday's hours are the first open ones.
    const simple = toSimple(values);

    expect(simple.custom).toBe(false);
    expect(simple.main).toEqual(range(600, 900));
    expect(simple.fridayOpen).toBe(true);
    expect(simple.friday).toEqual(range(780, 1080));
  });

  it('says whether the custom days fit the simple view as they are', () => {
    expect(fitsSimple(toCustom(sheetOf(hours(WITH_FRIDAY))))).toBe(true);
    expect(fitsSimple(sheetOf(hours([DAY, DAY, DAY, DAY, range(480, 840), null, DAY])))).toBe(
      false,
    );
  });
});

describe('sameWeek', () => {
  it('tells the week as saved apart from a changed one, and hours never saved from any', () => {
    expect(sameWeek(WITH_FRIDAY, hours(WITH_FRIDAY))).toBe(true);
    expect(sameWeek([DAY, DAY, DAY, DAY, DAY, null, DAY], hours(WITH_FRIDAY))).toBe(false);
    expect(sameWeek(WITH_FRIDAY, null)).toBe(false);
  });
});

describe('shiftsOutside', () => {
  const shift = (id: number, startsMinute: number, endsMinute: number): Shift => ({
    id,
    nameAr: `وردية ${String(id)}`,
    nameEn: null,
    startsMinute,
    endsMinute,
  });

  it('names the saved shifts the new week leaves outside every open day (DI-2)', () => {
    const morning = shift(1, 480, 780);
    const evening = shift(2, 1080, 1320);
    const week = [DAY, DAY, DAY, DAY, DAY, null, range(480, 1320)];

    expect(shiftsOutside(week, [morning, evening])).toEqual([]);
    expect(shiftsOutside([DAY, DAY, DAY, DAY, DAY, null, DAY], [morning, evening])).toEqual([
      evening,
    ]);
    expect(shiftsOutside([null, null, null, null, null, null, null], [morning])).toEqual([morning]);
  });
});
