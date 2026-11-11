import type { OpeningRange, Shift, SpaceHours } from '@masaha/shared/spaces';
import { describe, expect, it } from 'vitest';
import { daysNotCovering, newShift, sameShifts, shiftsInput, shiftsValues } from './shiftsForm';

const DAY: OpeningRange = { opensMinute: 480, closesMinute: 1080 };
const SHORT: OpeningRange = { opensMinute: 480, closesMinute: 840 };
// Sunday (0) to Saturday (6): Thursday (4) closes at 14:00, Friday closed.
const WEEK = [DAY, DAY, DAY, DAY, SHORT, null, DAY];
const MORNING: Shift = {
  id: 21,
  nameAr: 'الصباحية',
  nameEn: 'Morning',
  startsMinute: 480,
  endsMinute: 780,
};
const HOURS: SpaceHours = { days: WEEK, shifts: [MORNING] };

describe('shiftsValues and newShift', () => {
  it('holds the saved shifts, a missing English name as empty', () => {
    expect(shiftsValues({ ...HOURS, shifts: [{ ...MORNING, nameEn: null }] })).toEqual({
      shifts: [{ id: 21, nameAr: 'الصباحية', nameEn: '', startsMinute: 480, endsMinute: 780 }],
    });
  });

  it('opens on one new shift with no saved one, the first open day’s hours, Saturday first', () => {
    const saturdayLate = [DAY, DAY, DAY, DAY, DAY, null, { opensMinute: 600, closesMinute: 1200 }];

    expect(shiftsValues({ days: saturdayLate, shifts: [] })).toEqual({
      shifts: [{ id: null, nameAr: '', nameEn: '', startsMinute: 600, endsMinute: 1200 }],
    });
    expect(newShift(HOURS)).toMatchObject({ id: null, startsMinute: 480, endsMinute: 1080 });
  });
});

describe('shiftsInput', () => {
  it('sends the week as saved, a saved shift by its id, a blank English name as none (X1)', () => {
    expect(
      shiftsInput(
        {
          shifts: [
            { id: 21, nameAr: 'الصباحية', nameEn: 'Morning', startsMinute: 480, endsMinute: 780 },
            { id: null, nameAr: 'المسائية', nameEn: ' ', startsMinute: 780, endsMinute: 1080 },
          ],
        },
        WEEK,
      ),
    ).toEqual({
      days: WEEK,
      shifts: [
        { id: 21, nameAr: 'الصباحية', nameEn: 'Morning', startsMinute: 480, endsMinute: 780 },
        { nameAr: 'المسائية', nameEn: null, startsMinute: 780, endsMinute: 1080 },
      ],
    });
  });
});

describe('sameShifts', () => {
  it('tells the shifts as saved apart from changed ones, their order counting', () => {
    const evening: Shift = {
      id: 22,
      nameAr: 'المسائية',
      nameEn: null,
      startsMinute: 780,
      endsMinute: 1080,
    };

    expect(sameShifts([MORNING], HOURS)).toBe(true);
    expect(sameShifts([{ ...MORNING, nameEn: null }], HOURS)).toBe(false);
    expect(sameShifts([{ ...MORNING, id: 99 }], HOURS)).toBe(false);
    expect(sameShifts([], HOURS)).toBe(false);
    expect(sameShifts([evening, MORNING], { ...HOURS, shifts: [MORNING, evening] })).toBe(false);
  });
});

describe('daysNotCovering', () => {
  it('names the open days a shift does not fit, and none when it fits none', () => {
    expect(daysNotCovering(WEEK, { startsMinute: 780, endsMinute: 1020 })).toEqual([4]);
    expect(daysNotCovering(WEEK, { startsMinute: 480, endsMinute: 780 })).toEqual([]);
    expect(daysNotCovering(WEEK, { startsMinute: 1140, endsMinute: 1200 })).toEqual([]);
  });
});
