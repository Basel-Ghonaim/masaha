import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { checkOutVisitSchema } from './requests.ts';

/** The field errors of a check-out, or null when it passes. */
function errorsOf(input: unknown) {
  const result = checkOutVisitSchema.safeParse(input);
  return result.success ? null : toFieldErrors(result.error.issues, input);
}

describe('a check-out', () => {
  it("a check-out's payment is 1 to 10,000,000 whole agorot by cash or transfer; a typed charge needs its reason; the phone is normalised by phoneSchema", () => {
    expect(checkOutVisitSchema.parse({})).toEqual({});
    expect(
      checkOutVisitSchema.parse({
        checkedOutAt: '2026-10-18T07:00:00.000Z',
        payment: { amountAgorot: 1_500, method: 'CASH', note: '  at the door ' },
        phone: '059-900 0123',
        customerName: ' Omar ',
        charge: { amountAgorot: 2_000, reason: ' No evening price ' },
      }),
    ).toEqual({
      checkedOutAt: '2026-10-18T07:00:00.000Z',
      payment: { amountAgorot: 1_500, method: 'CASH', note: 'at the door' },
      phone: '+970599000123',
      customerName: 'Omar',
      charge: { amountAgorot: 2_000, reason: 'No evening price' },
    });
    expect(checkOutVisitSchema.parse({ payment: null })).toEqual({ payment: null });

    const payment = (more: object) => ({ payment: { amountAgorot: 500, method: 'CASH', ...more } });
    expect(errorsOf(payment({ amountAgorot: 0 }))).toEqual({
      'payment.amountAgorot': ['out_of_range'],
    });
    expect(errorsOf(payment({ amountAgorot: 10_000_000 }))).toBeNull();
    expect(errorsOf(payment({ amountAgorot: 10_000_001 }))).toEqual({
      'payment.amountAgorot': ['out_of_range'],
    });
    expect(errorsOf(payment({ amountAgorot: 12.5 }))).toEqual({
      'payment.amountAgorot': ['invalid_format'],
    });
    expect(errorsOf(payment({ method: 'CARD' }))).toEqual({ 'payment.method': ['invalid_choice'] });

    expect(errorsOf({ charge: { amountAgorot: 2_000 } })).toEqual({
      'charge.reason': ['required'],
    });
    expect(errorsOf({ charge: { amountAgorot: 2_000, reason: '  ' } })).toEqual({
      'charge.reason': ['too_short'],
    });
    expect(errorsOf({ charge: { amountAgorot: 0, reason: 'x' } })).toEqual({
      'charge.amountAgorot': ['out_of_range'],
    });

    expect(errorsOf({ phone: '12345' })).toEqual({ phone: ['invalid_format'] });
    expect(errorsOf({ checkedOutAt: 'yesterday' })).toEqual({ checkedOutAt: ['invalid_format'] });
    expect(errorsOf({ customerName: 'x'.repeat(61) })).toEqual({ customerName: ['too_long'] });
  });
});
