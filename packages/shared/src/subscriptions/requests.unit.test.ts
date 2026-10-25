import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { checkInsQuerySchema, correctPriceSchema, correctSubscriptionSchema } from './requests.ts';

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

describe('the check-ins query', () => {
  const errors = (input: unknown) => {
    const result = checkInsQuerySchema.safeParse(input);
    return result.success ? null : toFieldErrors(result.error.issues, input);
  };

  it('open=true, or a range of Gaza dates of at most 92 days with both counted, to not before from', () => {
    expect(checkInsQuerySchema.parse({ open: 'true' })).toMatchObject({ open: true });
    expect(checkInsQuerySchema.parse({ from: '2026-07-22', to: '2026-10-21', page: '2' })).toEqual({
      from: '2026-07-22',
      to: '2026-10-21',
      page: 2,
      limit: 20,
    });
    expect(errors({ from: '2026-10-21', to: '2026-10-21' })).toBeNull();
    expect(errors({ from: '2026-07-21', to: '2026-10-21' })).toEqual({ to: ['out_of_range'] });
    expect(errors({ from: '2026-10-21', to: '2026-10-20' })).toEqual({ to: ['out_of_range'] });
  });

  it('neither, a range half given, or both: each is refused', () => {
    expect(errors({})).toEqual({ from: ['required'], to: ['required'] });
    expect(errors({ from: '2026-10-21' })).toEqual({ to: ['required'] });
    expect(errors({ open: 'true', from: '2026-10-21', to: '2026-10-21' })).toEqual({
      open: ['invalid_choice'],
    });
    expect(errors({ open: 'false' })).toEqual({ open: ['invalid_choice'] });
    expect(errors({ from: '2026-02-30', to: '2026-03-01' })).toEqual({ from: ['invalid_format'] });
  });
});
