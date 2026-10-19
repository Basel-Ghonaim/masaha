import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { setCapacitySchema } from './requests.ts';

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
