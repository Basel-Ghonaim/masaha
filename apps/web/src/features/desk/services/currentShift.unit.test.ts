import type { Shift } from '@masaha/shared/spaces';
import { describe, expect, it } from 'vitest';
import { currentShift } from './currentShift';

const NIGHT: Shift = { id: 3, nameAr: 'ليلية', nameEn: null, startsMinute: 0, endsMinute: 480 };
const MORNING: Shift = { id: 1, nameAr: 'صباحي', nameEn: null, startsMinute: 480, endsMinute: 960 };
const EVENING: Shift = {
  id: 2,
  nameAr: 'مسائي',
  nameEn: null,
  startsMinute: 960,
  endsMinute: 1320,
};
const SHIFTS = [NIGHT, MORNING, EVENING];

describe('currentShift', () => {
  it('chooses the shift whose range holds Gaza’s minute now, its end not included', () => {
    // 07:59 and 08:00 in Gaza, summer (UTC+3).
    expect(currentShift(SHIFTS, new Date('2026-07-01T04:59:00.000Z'))).toBe(NIGHT);
    expect(currentShift(SHIFTS, new Date('2026-07-01T05:00:00.000Z'))).toBe(MORNING);
    expect(currentShift(SHIFTS, new Date('2026-07-01T13:00:00.000Z'))).toBe(EVENING);
  });

  it('chooses none outside every shift', () => {
    // 22:30 in Gaza.
    expect(currentShift(SHIFTS, new Date('2026-07-01T19:30:00.000Z'))).toBeNull();
    expect(currentShift([], new Date('2026-07-01T09:00:00.000Z'))).toBeNull();
  });

  it('reads past midnight on Gaza’s clock, not UTC’s', () => {
    // 01:30 in Gaza on 2 July is 22:30 UTC on 1 July.
    expect(currentShift(SHIFTS, new Date('2026-07-01T22:30:00.000Z'))).toBe(NIGHT);
  });
});
