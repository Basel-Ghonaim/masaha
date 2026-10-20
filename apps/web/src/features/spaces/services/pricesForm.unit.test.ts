import type { Price, UpdateSpacePricesRequest } from '@masaha/shared/spaces';
import { describe, expect, it } from 'vitest';
import { NEW_PRICE, pricesInput, pricesValues, samePrices } from './pricesForm';

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
