import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { paymentsQuerySchema, voidPaymentSchema } from './requests.ts';

const errorsOf =
  (schema: typeof voidPaymentSchema | typeof paymentsQuerySchema) => (input: unknown) => {
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

describe('the payments query', () => {
  it('both ends or neither, to not before from, at most 92 days with both included; the methods, kinds and void filters; recordedById positive; voided INCLUDE by default', () => {
    expect(paymentsQuerySchema.parse({})).toEqual({ page: 1, limit: 20, voided: 'INCLUDE' });
    expect(
      paymentsQuerySchema.parse({
        from: '2026-07-21',
        to: '2026-10-20',
        recordedById: '7',
        method: 'TRANSFER',
        kind: 'SUBSCRIPTION',
        voided: 'ONLY',
        page: '2',
        limit: '50',
      }),
    ).toEqual({
      from: '2026-07-21',
      to: '2026-10-20',
      recordedById: 7,
      method: 'TRANSFER',
      kind: 'SUBSCRIPTION',
      voided: 'ONLY',
      page: 2,
      limit: 50,
    });
    expect(paymentsQuerySchema.parse({ from: '2026-10-24', to: '2026-10-24' })).toMatchObject({
      from: '2026-10-24',
      to: '2026-10-24',
    });
    const errors = errorsOf(paymentsQuerySchema);
    expect(errors({ from: '2026-07-21', to: '2026-10-21' })).toEqual({ to: ['out_of_range'] });
    expect(errors({ from: '2026-10-24', to: '2026-10-23' })).toEqual({ to: ['out_of_range'] });
    expect(errors({ from: '2026-10-24' })).toEqual({ to: ['required'] });
    expect(errors({ to: '2026-10-24' })).toEqual({ from: ['required'] });
    expect(errors({ from: '2026-02-30', to: '2026-03-01' })).toEqual({ from: ['invalid_format'] });
    expect(errors({ method: 'CARD', kind: 'CHECK_IN', voided: 'ALL' })).toEqual({
      method: ['invalid_choice'],
      kind: ['invalid_choice'],
      voided: ['invalid_choice'],
    });
    expect(errors({ recordedById: '0' })).toEqual({ recordedById: ['out_of_range'] });
    expect(errors({ limit: '51' })).toEqual({ limit: ['out_of_range'] });
  });
});
