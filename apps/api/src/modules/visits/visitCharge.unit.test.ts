import type { Price } from '@masaha/shared/spaces';
import { describe, expect, it } from 'vitest';

import { ratesFor } from './visitCharge.ts';

/** A standard price: no shift and no label unless given. */
function price(period: Price['period'], amountAgorot: number, more: Partial<Price> = {}): Price {
  return {
    period,
    audience: 'GENERAL',
    shiftId: null,
    labelAr: null,
    labelEn: null,
    amountAgorot,
    ...more,
  };
}

const EVENING = 7;

describe("a visit's rates", () => {
  it('copies the general hour and day prices for a general visit', () => {
    const prices = [
      price('HOUR', 900, { labelAr: 'قاعة', labelEn: 'Hall' }),
      price('HOUR', 500),
      price('DAY', 2_500),
      price('WEEK', 10_000),
      price('HOUR', 400, { audience: 'STUDENT' }),
    ];
    expect(ratesFor(prices, { audience: 'GENERAL', shiftId: null })).toEqual({
      hourAgorot: 500,
      dayAgorot: 2_500,
    });
    expect(ratesFor([price('DAY', 2_500)], { audience: 'GENERAL', shiftId: null })).toEqual({
      hourAgorot: null,
      dayAgorot: 2_500,
    });
    expect(ratesFor([], { audience: 'GENERAL', shiftId: null })).toEqual({
      hourAgorot: null,
      dayAgorot: null,
    });
  });

  it('a student visit takes the student prices, each missing one falling back to the general, hour and day apart', () => {
    const prices = [
      price('HOUR', 500),
      price('DAY', 2_500),
      price('HOUR', 400, { audience: 'STUDENT' }),
    ];
    expect(ratesFor(prices, { audience: 'STUDENT', shiftId: null })).toEqual({
      hourAgorot: 400,
      dayAgorot: 2_500,
    });
  });

  it("a visit in a shift takes the shift's prices; a shift without a price falls back to the prices with no shift", () => {
    const prices = [
      price('HOUR', 500),
      price('DAY', 2_500),
      price('HOUR', 300, { shiftId: EVENING }),
      price('HOUR', 250, { shiftId: EVENING, audience: 'STUDENT' }),
    ];
    expect(ratesFor(prices, { audience: 'GENERAL', shiftId: EVENING })).toEqual({
      hourAgorot: 300,
      dayAgorot: 2_500,
    });
    expect(ratesFor(prices, { audience: 'STUDENT', shiftId: EVENING })).toEqual({
      hourAgorot: 250,
      dayAgorot: 2_500,
    });
    // Another shift, with no price of its own.
    expect(ratesFor(prices, { audience: 'GENERAL', shiftId: 8 })).toEqual({
      hourAgorot: 500,
      dayAgorot: 2_500,
    });
    // A visit with no shift never takes a shift's price.
    expect(
      ratesFor([price('HOUR', 300, { shiftId: EVENING })], { audience: 'GENERAL', shiftId: null }),
    ).toEqual({
      hourAgorot: null,
      dayAgorot: null,
    });
  });
});
