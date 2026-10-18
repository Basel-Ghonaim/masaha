import { describe, expect, it } from 'vitest';

import { packageChange, toPackageTerms } from './packageTerms.ts';
import type { PackageRow } from './packages.repository.ts';

const VALID = {
  name: 'Morning',
  validityDays: 30,
  billing: 'FIXED',
  priceAgorot: 5000,
  audience: 'GENERAL',
} as const;

/** The package as it is stored, as `id` 4. */
const CURRENT: PackageRow = {
  id: 4,
  name: 'Morning',
  validityDays: 30,
  totalDays: 10,
  daysPerWeek: null,
  hoursPerDay: 5,
  totalHours: null,
  billing: 'FIXED',
  priceAgorot: 5000,
  audience: 'GENERAL',
  shiftId: null,
  isActive: true,
};

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

describe('packageChange', () => {
  it('writes and records only the fields the edit sets to a new value', () => {
    expect(packageChange(CURRENT, { name: 'Morning', priceAgorot: 6000 })).toEqual({
      data: { priceAgorot: 6000 },
      before: { priceAgorot: 5000 },
      after: { priceAgorot: 6000 },
    });
  });

  it('clears a limit with null, recording what it held', () => {
    expect(packageChange(CURRENT, { totalDays: null })).toEqual({
      data: { totalDays: null },
      before: { totalDays: 10 },
      after: { totalDays: null },
    });
  });

  it('changes nothing for an edit of the same values, or of nothing', () => {
    expect(packageChange(CURRENT, {})).toEqual({ data: {}, before: {}, after: {} });
    expect(packageChange(CURRENT, { name: 'Morning', isActive: true })).toEqual({
      data: {},
      before: {},
      after: {},
    });
  });

  it('records a retirement as the flag’s change', () => {
    expect(packageChange(CURRENT, { isActive: false })).toEqual({
      data: { isActive: false },
      before: { isActive: true },
      after: { isActive: false },
    });
  });
});
