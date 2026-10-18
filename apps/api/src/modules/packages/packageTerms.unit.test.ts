import { describe, expect, it } from 'vitest';

import { toPackageTerms } from './packageTerms.ts';

const VALID = {
  name: 'Morning',
  validityDays: 30,
  billing: 'FIXED',
  priceAgorot: 5000,
  audience: 'GENERAL',
} as const;

describe('toPackageTerms', () => {
  it('stores an absent limit or shift as none', () => {
    expect(toPackageTerms(VALID)).toEqual({
      name: 'Morning',
      validityDays: 30,
      totalDays: null,
      daysPerWeek: null,
      hoursPerDay: null,
      totalHours: null,
      billing: 'FIXED',
      priceAgorot: 5000,
      audience: 'GENERAL',
      shiftId: null,
    });
  });
});
