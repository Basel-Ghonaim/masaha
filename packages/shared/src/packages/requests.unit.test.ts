import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { createPackageSchema, updatePackageSchema } from './requests.ts';

const VALID = {
  name: 'Morning',
  validityDays: 30,
  billing: 'FIXED',
  priceAgorot: 5000,
  audience: 'GENERAL',
} as const;

/** The field errors a create request fails with, or null when it passes. */
function errorsOf(body: object) {
  const result = createPackageSchema.safeParse(body);
  return result.success ? null : toFieldErrors(result.error.issues, body);
}

/** The field errors an edit request fails with, or null when it passes. */
function errorsOfEdit(body: object) {
  const result = updatePackageSchema.safeParse(body);
  return result.success ? null : toFieldErrors(result.error.issues, body);
}

describe('createPackageSchema', () => {
  it("takes a package's required terms alone, and every limit and the shift beside them", () => {
    expect(createPackageSchema.parse(VALID)).toEqual(VALID);

    const bounded = {
      ...VALID,
      totalDays: 10,
      daysPerWeek: 3,
      hoursPerDay: 5,
      totalHours: 40,
      shiftId: 7,
    };
    expect(createPackageSchema.parse(bounded)).toEqual(bounded);

    const none = {
      ...VALID,
      totalDays: null,
      daysPerWeek: null,
      hoursPerDay: null,
      totalHours: null,
      shiftId: null,
    };
    expect(createPackageSchema.parse(none)).toEqual(none);
  });

  it('trims the name, and refuses one empty, longer than 60 characters, or on two lines', () => {
    expect(createPackageSchema.parse({ ...VALID, name: '  Morning  ' })).toMatchObject({
      name: 'Morning',
    });
    expect(errorsOf({ ...VALID, name: '' })).toEqual({ name: ['too_short'] });
    expect(errorsOf({ ...VALID, name: '   ' })).toEqual({ name: ['too_short'] });
    expect(errorsOf({ ...VALID, name: 'a'.repeat(61) })).toEqual({ name: ['too_long'] });
    expect(errorsOf({ ...VALID, name: 'a'.repeat(60) })).toBeNull();
    expect(errorsOf({ ...VALID, name: 'Morning\nEvening' })).toEqual({
      name: ['invalid_format'],
    });
  });

  it('wants whole agorot from 1 to 10,000,000: no package is free', () => {
    expect(errorsOf({ ...VALID, priceAgorot: 1 })).toBeNull();
    expect(errorsOf({ ...VALID, priceAgorot: 10_000_000 })).toBeNull();
    expect(errorsOf({ ...VALID, priceAgorot: 0 })).toEqual({ priceAgorot: ['out_of_range'] });
    expect(errorsOf({ ...VALID, priceAgorot: 10_000_001 })).toEqual({
      priceAgorot: ['out_of_range'],
    });
    expect(errorsOf({ ...VALID, priceAgorot: 12.5 })).toEqual({
      priceAgorot: ['invalid_format'],
    });
  });

  it('keeps each count in its range: the validity and the totals from 1, days a week 1 to 7, hours a day 1 to 24', () => {
    expect(errorsOf({ ...VALID, validityDays: 1 })).toBeNull();
    expect(errorsOf({ ...VALID, daysPerWeek: 7 })).toBeNull();
    expect(errorsOf({ ...VALID, hoursPerDay: 24 })).toBeNull();

    expect(errorsOf({ ...VALID, validityDays: 0 })).toEqual({ validityDays: ['out_of_range'] });
    expect(errorsOf({ ...VALID, totalDays: 0 })).toEqual({ totalDays: ['out_of_range'] });
    expect(errorsOf({ ...VALID, totalHours: 0 })).toEqual({ totalHours: ['out_of_range'] });
    expect(errorsOf({ ...VALID, daysPerWeek: 0 })).toEqual({ daysPerWeek: ['out_of_range'] });
    expect(errorsOf({ ...VALID, daysPerWeek: 8 })).toEqual({ daysPerWeek: ['out_of_range'] });
    expect(errorsOf({ ...VALID, hoursPerDay: 0 })).toEqual({ hoursPerDay: ['out_of_range'] });
    expect(errorsOf({ ...VALID, hoursPerDay: 25 })).toEqual({ hoursPerDay: ['out_of_range'] });
    expect(errorsOf({ ...VALID, validityDays: 2_147_483_648 })).toEqual({
      validityDays: ['out_of_range'],
    });
    expect(errorsOf({ ...VALID, validityDays: 1.5 })).toEqual({
      validityDays: ['invalid_format'],
    });
  });

  it('refuses a billing or an audience not on its list', () => {
    expect(errorsOf({ ...VALID, billing: 'WEEKLY' })).toEqual({ billing: ['invalid_choice'] });
    expect(errorsOf({ ...VALID, audience: 'ALL' })).toEqual({ audience: ['invalid_choice'] });
  });

  it('requires the name, the validity, the billing, the price and the audience', () => {
    // The two choices answer `invalid_choice`, absent or not: `toFieldErrors` maps an enum's
    // failure to it, as the prices' period and audience already do.
    expect(errorsOf({})).toEqual({
      name: ['required'],
      validityDays: ['required'],
      billing: ['invalid_choice'],
      priceAgorot: ['required'],
      audience: ['invalid_choice'],
    });
  });
});

describe('updatePackageSchema', () => {
  it('takes any part of the terms and the active flag on an edit, and nothing', () => {
    expect(updatePackageSchema.parse({})).toEqual({});
    expect(updatePackageSchema.parse({ isActive: false })).toEqual({ isActive: false });
    expect(updatePackageSchema.parse({ totalDays: null, shiftId: null })).toEqual({
      totalDays: null,
      shiftId: null,
    });
  });

  it('never clears a required term on an edit', () => {
    // The two choices answer `invalid_choice`, as they do when absent: `toFieldErrors` maps an
    // enum's failure to it whether the value is absent or one it cannot take.
    expect(errorsOfEdit({ name: null })).toEqual({ name: ['invalid_format'] });
    expect(errorsOfEdit({ validityDays: null })).toEqual({ validityDays: ['invalid_format'] });
    expect(errorsOfEdit({ priceAgorot: null })).toEqual({ priceAgorot: ['invalid_format'] });
    expect(errorsOfEdit({ isActive: null })).toEqual({ isActive: ['invalid_format'] });
    expect(errorsOfEdit({ billing: null })).toEqual({ billing: ['invalid_choice'] });
    expect(errorsOfEdit({ audience: null })).toEqual({ audience: ['invalid_choice'] });
  });
});
