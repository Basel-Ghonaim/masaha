import type { Price } from '@masaha/shared/spaces';
import type { Rates } from '@masaha/shared/visits';
import { describe, expect, it } from 'vitest';

import { chargeOf, ratesFor } from './visitCharge.ts';

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

/** A stay from 08:00 for this many minutes (and seconds), on one day. */
function stayOf(minutes: number, seconds = 0) {
  const from = new Date('2026-10-18T08:00:00+03:00');
  return { from, to: new Date(from.getTime() + (minutes * 60 + seconds) * 1000) };
}

const RATES: Rates = { hourAgorot: 500, dayAgorot: 2_500 };
const UP_AFTER_15 = {
  rounding: 'UP_AFTER_MINUTES',
  roundingMinutes: 15,
  capAtDayPrice: true,
} as const;
const HALF_HOUR = {
  rounding: 'NEAREST_HALF_HOUR',
  roundingMinutes: null,
  capAtDayPrice: true,
} as const;
const PER_MINUTE = { rounding: 'PER_MINUTE', roundingMinutes: null, capAtDayPrice: true } as const;

/** The charge's amount, for a stay of this many minutes. */
function amountOf(minutes: number, rule: Parameters<typeof chargeOf>[2], rates = RATES) {
  return chargeOf(stayOf(minutes), rates, rule)?.amountAgorot;
}

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

describe("a visit's charge", () => {
  it('up after N minutes: whole hours, one more past N minutes, at least one hour', () => {
    expect(chargeOf(stayOf(140), RATES, UP_AFTER_15)).toEqual({
      amountAgorot: 1_500,
      billedMinutes: 140,
      roundingRule: 'UP_AFTER_MINUTES',
      roundingMinutes: 15,
      capApplied: false,
    });
    expect(amountOf(59, UP_AFTER_15)).toBe(500);
    expect(amountOf(75, UP_AFTER_15)).toBe(500);
    expect(chargeOf(stayOf(75, 59), RATES, UP_AFTER_15)?.amountAgorot).toBe(500);
    expect(amountOf(76, UP_AFTER_15)).toBe(1_000);
    // A stay of seconds is billed one minute, and one hour.
    expect(chargeOf(stayOf(0, 30), RATES, UP_AFTER_15)).toMatchObject({
      amountAgorot: 500,
      billedMinutes: 1,
    });
  });

  it('to the nearest half hour, a quarter rounding up, at least one half hour', () => {
    expect(chargeOf(stayOf(45), RATES, HALF_HOUR)).toEqual({
      amountAgorot: 500,
      billedMinutes: 45,
      roundingRule: 'NEAREST_HALF_HOUR',
      roundingMinutes: null,
      capApplied: false,
    });
    expect(amountOf(44, HALF_HOUR)).toBe(250);
    expect(amountOf(70, HALF_HOUR)).toBe(500);
    expect(amountOf(5, HALF_HOUR)).toBe(250);
    // Half an odd rate: half an agora rounds up.
    expect(amountOf(30, HALF_HOUR, { hourAgorot: 501, dayAgorot: null })).toBe(251);
  });

  it('per minute, a fraction of an agora rounded half up', () => {
    expect(chargeOf(stayOf(9), RATES, PER_MINUTE)).toEqual({
      amountAgorot: 75,
      billedMinutes: 9,
      roundingRule: 'PER_MINUTE',
      roundingMinutes: null,
      capApplied: false,
    });
    expect(amountOf(7, PER_MINUTE)).toBe(58);
    expect(amountOf(3, PER_MINUTE, { hourAgorot: 510, dayAgorot: null })).toBe(26);
  });

  it('caps at the day price when on, and says so; never above it; off, the hours stand', () => {
    expect(chargeOf(stayOf(8 * 60), RATES, UP_AFTER_15)).toMatchObject({
      amountAgorot: 2_500,
      capApplied: true,
    });
    expect(chargeOf(stayOf(5 * 60), RATES, UP_AFTER_15)).toMatchObject({
      amountAgorot: 2_500,
      capApplied: false,
    });
    expect(chargeOf(stayOf(8 * 60), RATES, { ...UP_AFTER_15, capAtDayPrice: false })).toMatchObject(
      { amountAgorot: 4_000, capApplied: false },
    );
    expect(
      chargeOf(stayOf(8 * 60), { hourAgorot: 500, dayAgorot: null }, UP_AFTER_15),
    ).toMatchObject({ amountAgorot: 4_000, capApplied: false });
  });

  it('with no hour price the charge is the day price; with neither, none', () => {
    expect(chargeOf(stayOf(90), { hourAgorot: null, dayAgorot: 2_500 }, UP_AFTER_15)).toEqual({
      amountAgorot: 2_500,
      billedMinutes: 90,
      roundingRule: null,
      roundingMinutes: null,
      capApplied: null,
    });
    expect(chargeOf(stayOf(90), { hourAgorot: null, dayAgorot: null }, UP_AFTER_15)).toBeNull();
  });
});
