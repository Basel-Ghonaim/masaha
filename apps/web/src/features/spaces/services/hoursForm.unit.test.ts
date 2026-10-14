import type { SpaceHours, UpdateSpaceHoursRequest } from '@masaha/shared/spaces';
import { describe, expect, it } from 'vitest';
import {
  SHOWN_DAYS,
  daysNotCovering,
  firstOpenDay,
  hoursInput,
  hoursValues,
  sameHours,
  type HoursValues,
} from './hoursForm';

const OPEN = { open: true, opensMinute: '08:00', closesMinute: '18:00' };
const CLOSED = { open: false, opensMinute: '08:00', closesMinute: '18:00' };

/** Saved hours: Sunday to Thursday 08:00–18:00, Friday closed, Saturday 09:00–24:00, one shift. */
const HOURS: SpaceHours = {
  days: [
    { opensMinute: 480, closesMinute: 1080 },
    { opensMinute: 480, closesMinute: 1080 },
    { opensMinute: 480, closesMinute: 1080 },
    { opensMinute: 480, closesMinute: 1080 },
    { opensMinute: 480, closesMinute: 1080 },
    null,
    { opensMinute: 540, closesMinute: 1440 },
  ],
  shifts: [{ id: 4, nameAr: 'صباحية', nameEn: null, startsMinute: 480, endsMinute: 780 }],
};

const MORNING = { id: 4, nameAr: 'صباحية', nameEn: null, startsMinute: 480, endsMinute: 780 };

/** The request a save of `HOURS` as they are sends. */
const REQUEST: UpdateSpaceHoursRequest = { days: HOURS.days, shifts: [MORNING] };

describe('hoursValues', () => {
  it('fills a space with no hours from the template: Saturday to Thursday 08:00–18:00, Friday closed', () => {
    expect(hoursValues(null)).toEqual({
      days: [OPEN, OPEN, OPEN, OPEN, OPEN, CLOSED, OPEN],
      shifts: [],
    });
  });

  it('holds saved hours as 24-hour times, a closed day ready to open, a missing English name as empty', () => {
    expect(hoursValues(HOURS)).toEqual({
      days: [
        OPEN,
        OPEN,
        OPEN,
        OPEN,
        OPEN,
        CLOSED,
        { open: true, opensMinute: '09:00', closesMinute: '24:00' },
      ],
      shifts: [{ id: 4, nameAr: 'صباحية', nameEn: '', startsMinute: '08:00', endsMinute: '13:00' }],
    });
  });

  it('shows the week Saturday first', () => {
    expect(SHOWN_DAYS).toEqual([6, 0, 1, 2, 3, 4, 5]);
  });
});

describe('hoursInput', () => {
  it('builds the contract’s week, Sunday first, a closed day as null', () => {
    const values: HoursValues = {
      days: [
        { open: true, opensMinute: '7:30', closesMinute: '1600' },
        CLOSED,
        CLOSED,
        CLOSED,
        CLOSED,
        CLOSED,
        { open: true, opensMinute: '00:00', closesMinute: '24:00' },
      ],
      shifts: [],
    };

    expect(hoursInput(values)).toEqual({
      days: [
        { opensMinute: 450, closesMinute: 960 },
        null,
        null,
        null,
        null,
        null,
        { opensMinute: 0, closesMinute: 1440 },
      ],
      shifts: [],
    });
  });

  it('sends a saved shift with its id, a new one without, a blank English name as none', () => {
    const values: HoursValues = {
      days: hoursValues(null).days,
      shifts: [
        { id: 4, nameAr: 'صباحية', nameEn: '  ', startsMinute: '08:00', endsMinute: '13:00' },
        { id: null, nameAr: 'مسائية', nameEn: 'Evening', startsMinute: '13', endsMinute: '18' },
      ],
    };

    expect(hoursInput(values).shifts).toEqual([
      { id: 4, nameAr: 'صباحية', nameEn: null, startsMinute: 480, endsMinute: 780 },
      { nameAr: 'مسائية', nameEn: 'Evening', startsMinute: 780, endsMinute: 1080 },
    ]);
  });
});

describe('sameHours', () => {
  it('tells the hours as filled from apart from changed ones, the shifts’ order counting', () => {
    const second = {
      id: 5,
      nameAr: 'مسائية',
      nameEn: 'Evening',
      startsMinute: 780,
      endsMinute: 1080,
    };
    const two: SpaceHours = { ...HOURS, shifts: [...HOURS.shifts, second] };

    expect(sameHours(REQUEST, HOURS)).toBe(true);
    expect(sameHours({ ...REQUEST, shifts: [...REQUEST.shifts, second] }, two)).toBe(true);
    expect(sameHours({ ...REQUEST, shifts: [second, ...REQUEST.shifts] }, two)).toBe(false);
    expect(sameHours({ ...REQUEST, days: [...REQUEST.days.slice(0, 6), null] }, HOURS)).toBe(false);
    expect(sameHours({ ...REQUEST, shifts: [{ ...MORNING, nameEn: 'Morning' }] }, HOURS)).toBe(
      false,
    );
    expect(sameHours({ ...REQUEST, shifts: [{ ...MORNING, id: undefined }] }, HOURS)).toBe(false);
    expect(sameHours(REQUEST, null)).toBe(false);
  });
});

describe('firstOpenDay', () => {
  it('finds the first open day as the week is shown, Saturday first', () => {
    const days = [CLOSED, OPEN, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED];
    expect(firstOpenDay({ days, shifts: [] })).toBe(1);
    expect(firstOpenDay(hoursValues(null))).toBe(6);
    expect(firstOpenDay({ days: days.map(() => CLOSED), shifts: [] })).toBeNull();
  });
});

describe('daysNotCovering', () => {
  it('names the open days a shift does not fit, none when it fits no open day', () => {
    // Saturday 09:00–24:00, Sunday to Thursday 08:00–18:00, Friday closed.
    const values = (startsMinute: string, endsMinute: string): HoursValues => ({
      days: hoursValues(HOURS).days,
      shifts: [{ id: null, nameAr: 'ليلية', nameEn: '', startsMinute, endsMinute }],
    });

    expect(daysNotCovering(values('20:00', '23:30'), 0)).toEqual([0, 1, 2, 3, 4]);
    expect(daysNotCovering(values('08:00', '13:00'), 0)).toEqual([6]);
    expect(daysNotCovering(values('09:00', '18:00'), 0)).toEqual([]);
    expect(daysNotCovering(values('06:00', '07:00'), 0)).toEqual([]);
    expect(daysNotCovering(values('soon', '23:30'), 0)).toEqual([]);
  });
});
