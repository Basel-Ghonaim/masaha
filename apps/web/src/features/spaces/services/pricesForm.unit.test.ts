import type { Price, UpdateSpacePricesRequest } from '@masaha/shared/spaces';
import { describe, expect, it } from 'vitest';
import { nextPrice, pricesInput, pricesValues, samePrices, type PricesValues } from './pricesForm';

/** A price as the Sheet holds it: a day for everyone, no shift and no label, its amount to type. */
const NEW_PRICE: PricesValues['prices'][number] = {
  period: 'DAY',
  audience: 'GENERAL',
  shiftId: '',
  labelAr: '',
  labelEn: '',
  amountAgorot: '',
};

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

describe('pricesInput, a labelled price', () => {
  it('sends a saved custom label back as it was, both its languages kept', () => {
    expect(pricesInput(pricesValues([MONTH])).prices).toEqual([MONTH]);
  });
});

describe('nextPrice', () => {
  const row = (
    period: PricesValues['prices'][number]['period'],
    audience: PricesValues['prices'][number]['audience'] = 'GENERAL',
    extra: Partial<PricesValues['prices'][number]> = {},
  ) => ({ ...NEW_PRICE, period, audience, amountAgorot: '10', ...extra });

  it('takes the first period not yet priced for everyone, hour first, its amount to type', () => {
    expect(nextPrice([])).toEqual({ ...NEW_PRICE, period: 'HOUR' });
    expect(nextPrice([row('HOUR'), row('WEEK')])).toEqual({ ...NEW_PRICE, period: 'DAY' });
  });

  it('counts neither a shift’s price nor a labelled one as everyone’s', () => {
    expect(
      nextPrice([
        row('HOUR', 'GENERAL', { shiftId: '4' }),
        row('HOUR', 'GENERAL', { labelAr: 'مسائي' }),
      ]),
    ).toEqual({
      ...NEW_PRICE,
      period: 'HOUR',
    });
  });

  it('turns to the students’ once every period is priced for everyone', () => {
    const everyone = [row('HOUR'), row('DAY'), row('WEEK'), row('MONTH')];
    expect(nextPrice(everyone)).toEqual({ ...NEW_PRICE, period: 'HOUR', audience: 'STUDENT' });
    expect(nextPrice([...everyone, row('HOUR', 'STUDENT')])).toEqual({
      ...NEW_PRICE,
      period: 'DAY',
      audience: 'STUDENT',
    });
  });

  it('falls back to a day for everyone once both are priced every period', () => {
    const all = (['HOUR', 'DAY', 'WEEK', 'MONTH'] as const).flatMap((period) => [
      row(period),
      row(period, 'STUDENT'),
    ]);
    expect(nextPrice(all)).toEqual(NEW_PRICE);
  });
});
