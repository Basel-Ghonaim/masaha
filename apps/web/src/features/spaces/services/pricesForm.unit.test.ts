import type { Price, UpdateSpacePricesRequest } from '@masaha/shared/spaces';
import { describe, expect, it } from 'vitest';
import {
  NEW_PRICE,
  agorotOf,
  pricesInput,
  pricesValues,
  samePrices,
  shekelsOf,
} from './pricesForm';

const DAY: Price = {
  period: 'DAY',
  audience: 'GENERAL',
  shiftId: null,
  labelAr: null,
  labelEn: null,
  amountAgorot: 1500,
};
const MONTH: Price = {
  period: 'MONTH',
  audience: 'STUDENT',
  shiftId: 4,
  labelAr: 'باقة المساء',
  labelEn: 'Evening pass',
  amountAgorot: 25050,
};

describe('agorotOf', () => {
  it('reads an amount in shekels as whole agorot, Arabic digits and separators included', () => {
    expect(agorotOf('15')).toBe(1500);
    expect(agorotOf(' 12.5 ')).toBe(1250);
    expect(agorotOf('12.50')).toBe(1250);
    expect(agorotOf('0.05')).toBe(5);
    expect(agorotOf('١٢٫٥')).toBe(1250);
    expect(agorotOf('12,75')).toBe(1275);
    expect(agorotOf('٫٥')).toBe(50);
    expect(agorotOf('0')).toBe(0);
  });

  it('leaves an amount with more than two decimals as no whole number of agorot', () => {
    expect(Number.isInteger(agorotOf('12.555'))).toBe(false);
    expect(agorotOf('12.555')).toBeCloseTo(1255.5);
  });

  it('leaves what is no amount as typed, and a blank as no value', () => {
    expect(agorotOf('')).toBeUndefined();
    expect(agorotOf('  ')).toBeUndefined();
    expect(agorotOf('fifteen')).toBe('fifteen');
    expect(agorotOf('1.2.3')).toBe('1.2.3');
    expect(agorotOf('-5')).toBe('-5');
  });
});

describe('shekelsOf', () => {
  it('writes agorot as shekels, with no decimals for a whole amount', () => {
    expect(shekelsOf(1500)).toBe('15');
    expect(shekelsOf(1250)).toBe('12.50');
    expect(shekelsOf(5)).toBe('0.05');
    expect(shekelsOf(10_000_000)).toBe('100000');
  });
});

describe('pricesValues', () => {
  it('holds each price as its form does: no shift and no label as empty, the amount in shekels', () => {
    expect(pricesValues([DAY, MONTH])).toEqual({
      prices: [
        { ...NEW_PRICE, amountAgorot: '15' },
        {
          period: 'MONTH',
          audience: 'STUDENT',
          shiftId: '4',
          labelAr: 'باقة المساء',
          labelEn: 'Evening pass',
          amountAgorot: '250.50',
        },
      ],
    });
  });
});

describe('pricesInput', () => {
  it('builds the contract’s prices, no shift and a blank label as none', () => {
    expect(
      pricesInput({
        prices: [
          { ...NEW_PRICE, labelAr: '  ', labelEn: '', amountAgorot: '15' },
          { ...NEW_PRICE, shiftId: '4', labelAr: 'مسائي', amountAgorot: '٢٠' },
        ],
      }),
    ).toEqual({
      prices: [
        { ...DAY },
        {
          period: 'DAY',
          audience: 'GENERAL',
          shiftId: 4,
          labelAr: 'مسائي',
          labelEn: null,
          amountAgorot: 2000,
        },
      ],
    });
  });
});

describe('samePrices', () => {
  it('tells the prices as filled from apart from changed ones, their order counting', () => {
    const request: UpdateSpacePricesRequest = { prices: [DAY, MONTH] };

    expect(samePrices(request, [DAY, MONTH])).toBe(true);
    expect(samePrices({ prices: [MONTH, DAY] }, [DAY, MONTH])).toBe(false);
    expect(samePrices({ prices: [{ ...DAY, amountAgorot: 1600 }, MONTH] }, [DAY, MONTH])).toBe(
      false,
    );
    expect(samePrices({ prices: [DAY, { ...MONTH, labelEn: undefined }] }, [DAY, MONTH])).toBe(
      false,
    );
    expect(samePrices({ prices: [{ ...DAY, shiftId: undefined }] }, [DAY])).toBe(true);
    expect(samePrices({ prices: [] }, [DAY])).toBe(false);
  });
});
