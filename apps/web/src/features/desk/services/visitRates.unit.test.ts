import type { VisitTerms } from '@masaha/shared/visits';
import { describe, expect, it } from 'vitest';
import { offersStudent, ratesFor } from './visitRates';

const TERMS: VisitTerms = {
  rounding: { rule: 'UP_AFTER_MINUTES', minutes: 15 },
  capAtDayPrice: true,
  mayTypePrice: false,
  rates: [
    {
      shiftId: null,
      general: { hourAgorot: 500, dayAgorot: 2500 },
      student: { hourAgorot: 400, dayAgorot: 2000 },
    },
    { shiftId: 1, general: { hourAgorot: 700, dayAgorot: null }, student: null },
  ],
};

describe('ratesFor', () => {
  it('reads the chosen shift’s rates, else the no-shift row', () => {
    expect(ratesFor(TERMS, { shiftId: 1, student: false })).toEqual({
      hourAgorot: 700,
      dayAgorot: null,
    });
    expect(ratesFor(TERMS, { shiftId: null, student: false })).toEqual({
      hourAgorot: 500,
      dayAgorot: 2500,
    });
    expect(ratesFor(TERMS, { shiftId: 9, student: false })).toEqual({
      hourAgorot: 500,
      dayAgorot: 2500,
    });
  });

  it('reads the student rates only where the row carries them', () => {
    expect(ratesFor(TERMS, { shiftId: null, student: true })).toEqual({
      hourAgorot: 400,
      dayAgorot: 2000,
    });
    expect(ratesFor(TERMS, { shiftId: 1, student: true })).toEqual({
      hourAgorot: 700,
      dayAgorot: null,
    });
  });
});

describe('offersStudent', () => {
  it('offers «Student» only where the chosen row carries student rates', () => {
    expect(offersStudent(TERMS, null)).toBe(true);
    expect(offersStudent(TERMS, 1)).toBe(false);
    expect(offersStudent({ ...TERMS, rates: [] }, null)).toBe(false);
  });
});
