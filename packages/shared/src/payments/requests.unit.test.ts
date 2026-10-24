import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { voidPaymentSchema } from './requests.ts';

const errorsOf = (schema: typeof voidPaymentSchema) => (input: unknown) => {
  const result = schema.safeParse(input);
  return result.success ? null : toFieldErrors(result.error.issues, input);
};

describe("a payment's void", () => {
  it('a void needs a reason of 1–200 characters', () => {
    expect(voidPaymentSchema.parse({ reason: ' سُجّلت مرتين ' })).toEqual({
      reason: 'سُجّلت مرتين',
    });
    expect(voidPaymentSchema.parse({ reason: 'x'.repeat(200) })).toEqual({
      reason: 'x'.repeat(200),
    });
    const errors = errorsOf(voidPaymentSchema);
    expect(errors({})).toEqual({ reason: ['required'] });
    expect(errors({ reason: '   ' })).toEqual({ reason: ['too_short'] });
    expect(errors({ reason: 'x'.repeat(201) })).toEqual({ reason: ['too_long'] });
  });
});
