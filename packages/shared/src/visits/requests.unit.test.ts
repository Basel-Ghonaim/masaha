import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { checkInVisitSchema } from './requests.ts';

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
