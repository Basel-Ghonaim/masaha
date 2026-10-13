import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { photoOrderSchema } from './requests.ts';

/** The field errors an order fails with, or null when it passes. */
function errorsOf(body: object) {
  const result = photoOrderSchema.safeParse(body);
  return result.success ? null : toFieldErrors(result.error.issues, body);
}

describe('photoOrderSchema', () => {
  it('takes the gallery’s ids, first to last, up to the ten photos a space may have', () => {
    expect(photoOrderSchema.parse({ ids: [3, 1, 2] })).toEqual({ ids: [3, 1, 2] });
    expect(errorsOf({ ids: Array.from({ length: 10 }, (_, i) => i + 1) })).toBeNull();
    expect(errorsOf({ ids: Array.from({ length: 11 }, (_, i) => i + 1) })).toEqual({
      ids: ['too_long'],
    });
  });

  it('requires the ids, each a positive whole number', () => {
    expect(errorsOf({})).toEqual({ ids: ['required'] });
    expect(errorsOf({ ids: [0] })).not.toBeNull();
    expect(errorsOf({ ids: [1.5] })).not.toBeNull();
    expect(errorsOf({ ids: ['1'] })).not.toBeNull();
  });
});
