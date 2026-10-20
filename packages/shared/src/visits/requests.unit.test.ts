import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { checkInVisitSchema, priceVisitSchema } from './requests.ts';

/** The field errors of a check-in, or null when it passes. */
function errorsOf(input: unknown) {
  const result = checkInVisitSchema.safeParse(input);
  return result.success ? null : toFieldErrors(result.error.issues, input);
}

describe('a check-in by name', () => {
  it('takes a name of 1–60 characters, an audience from its list and an optional shift', () => {
    expect(checkInVisitSchema.parse({ visitorName: '  Omar  ' })).toEqual({
      visitorName: 'Omar',
      audience: 'GENERAL',
    });
    expect(
      checkInVisitSchema.parse({ visitorName: 'Layla', audience: 'STUDENT', shiftId: 3 }),
    ).toEqual({ visitorName: 'Layla', audience: 'STUDENT', shiftId: 3 });
    expect(checkInVisitSchema.parse({ visitorName: 'Rami', shiftId: null })).toMatchObject({
      shiftId: null,
    });
    expect(errorsOf({ visitorName: 'x'.repeat(60) })).toBeNull();

    expect(errorsOf({})).toEqual({ visitorName: ['required'] });
    expect(errorsOf({ visitorName: '   ' })).toEqual({ visitorName: ['too_short'] });
    expect(errorsOf({ visitorName: 'x'.repeat(61) })).toEqual({ visitorName: ['too_long'] });
    expect(errorsOf({ visitorName: 'Omar', audience: 'CHILD' })).toEqual({
      audience: ['invalid_choice'],
    });
    expect(errorsOf({ visitorName: 'Omar', shiftId: 0 })).toEqual({ shiftId: ['out_of_range'] });
    expect(errorsOf({ visitorName: 'Omar', shiftId: '3' })).toEqual({
      shiftId: ['invalid_format'],
    });
  });
});

describe("a visit's price typed by hand", () => {
  it('takes 1 to 10,000,000 whole agorot and a reason of 1–200 characters', () => {
    expect(priceVisitSchema.parse({ amountAgorot: 1_500, reason: '  No evening price ' })).toEqual({
      amountAgorot: 1_500,
      reason: 'No evening price',
    });
    expect(priceVisitSchema.safeParse({ amountAgorot: 10_000_000, reason: 'x' }).success).toBe(
      true,
    );

    const errorsOf = (input: unknown) => {
      const result = priceVisitSchema.safeParse(input);
      return result.success ? null : toFieldErrors(result.error.issues, input);
    };
    expect(errorsOf({})).toEqual({ amountAgorot: ['required'], reason: ['required'] });
    expect(errorsOf({ amountAgorot: 0, reason: 'x' })).toEqual({ amountAgorot: ['out_of_range'] });
    expect(errorsOf({ amountAgorot: 10_000_001, reason: 'x' })).toEqual({
      amountAgorot: ['out_of_range'],
    });
    expect(errorsOf({ amountAgorot: 1.5, reason: 'x' })).toEqual({
      amountAgorot: ['invalid_format'],
    });
    expect(errorsOf({ amountAgorot: 100, reason: 'x'.repeat(201) })).toEqual({
      reason: ['too_long'],
    });
  });
});
