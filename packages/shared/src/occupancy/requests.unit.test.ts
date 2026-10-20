import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { setCapacitySchema, setStatusOverrideSchema } from './requests.ts';

/** The field errors a capacity request fails with, or null when it passes. */
function errorsOf(body: object) {
  const result = setCapacitySchema.safeParse(body);
  return result.success ? null : toFieldErrors(result.error.issues, body);
}

describe('setCapacitySchema', () => {
  it('takes a capacity from 1 to 1,000, or null to clear it, and requires the field', () => {
    expect(errorsOf({ capacity: 1 })).toBeNull();
    expect(errorsOf({ capacity: 1_000 })).toBeNull();
    expect(errorsOf({ capacity: null })).toBeNull();

    expect(errorsOf({ capacity: 0 })).toEqual({ capacity: ['out_of_range'] });
    expect(errorsOf({ capacity: 1_001 })).toEqual({ capacity: ['out_of_range'] });
    expect(errorsOf({ capacity: 1.5 })).toEqual({ capacity: ['invalid_format'] });
    expect(errorsOf({ capacity: '40' })).toEqual({ capacity: ['invalid_format'] });
    expect(errorsOf({})).toEqual({ capacity: ['required'] });
  });
});

describe('setStatusOverrideSchema', () => {
  /** The field errors an override request fails with, or null when it passes. */
  function overrideErrorsOf(body: object) {
    const result = setStatusOverrideSchema.safeParse(body);
    return result.success ? null : toFieldErrors(result.error.issues, body);
  }

  it('an override takes one of the three states and one of the four durations', () => {
    for (const state of ['AVAILABLE', 'FULL', 'CLOSED']) {
      for (const duration of ['MINUTES_30', 'HOUR_1', 'HOURS_2', 'UNTIL_CLOSING']) {
        expect(overrideErrorsOf({ state, duration })).toBeNull();
      }
    }

    expect(overrideErrorsOf({ state: 'BUSY', duration: 'HOUR_1' })).toEqual({
      state: ['invalid_choice'],
    });
    expect(overrideErrorsOf({ state: 'FULL', duration: 'HOURS_3' })).toEqual({
      duration: ['invalid_choice'],
    });
    // Absent, each choice answers `invalid_choice`: `toFieldErrors` maps an enum's failure to it.
    expect(overrideErrorsOf({})).toEqual({
      state: ['invalid_choice'],
      duration: ['invalid_choice'],
    });
  });
});
