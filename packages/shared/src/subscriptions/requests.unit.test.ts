import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { correctPriceSchema, correctSubscriptionSchema } from './requests.ts';

const errorsOf =
  (schema: typeof correctPriceSchema | typeof correctSubscriptionSchema) => (input: unknown) => {
    const result = schema.safeParse(input);
    return result.success ? null : toFieldErrors(result.error.issues, input);
  };

describe("a subscription's corrections", () => {
  it('limits, dates and the name: each optional, a limit or the end cleared with null', () => {
    expect(
      correctSubscriptionSchema.parse({
        name: ' مسائي ',
        endsOn: null,
        daysPerWeek: 3,
        totalHours: null,
      }),
    ).toEqual({ name: 'مسائي', endsOn: null, daysPerWeek: 3, totalHours: null });
    const errors = errorsOf(correctSubscriptionSchema);
    expect(errors({ startsOn: null, daysPerWeek: 8, endsOn: '2026-02-30' })).toEqual({
      startsOn: ['invalid_format'],
      daysPerWeek: ['out_of_range'],
      endsOn: ['invalid_format'],
    });
    expect(errors({ name: '' })).toEqual({ name: ['too_short'] });
  });

  it('price and billing come together, with a reason', () => {
    expect(
      correctPriceSchema.parse({ billing: 'FIXED', priceAgorot: 25_000, reason: ' agreed ' }),
    ).toEqual({ billing: 'FIXED', priceAgorot: 25_000, reason: 'agreed' });
    expect(errorsOf(correctPriceSchema)({ billing: 'FIXED', priceAgorot: 0 })).toEqual({
      priceAgorot: ['out_of_range'],
      reason: ['required'],
    });
  });
});
