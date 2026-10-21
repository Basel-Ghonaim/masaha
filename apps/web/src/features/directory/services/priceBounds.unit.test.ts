import { describe, expect, it } from 'vitest';
import { priceBounds } from './priceBounds';

describe('priceBounds', () => {
  it('reads whole shekels, in Western or Arabic digits; blank is no bound', () => {
    expect(priceBounds('10', '30')).toEqual({ min: 10, max: 30 });
    expect(priceBounds('١٠', '٣٠')).toEqual({ min: 10, max: 30 });
    expect(priceBounds(' 15 ', '')).toEqual({ min: 15 });
    expect(priceBounds('', '')).toEqual({});
    expect(priceBounds('', '100000')).toEqual({ max: 100_000 });
  });

  it('refuses 0, letters, a fraction and an amount above 100,000', () => {
    expect(priceBounds('0', '')).toEqual({ minError: 'invalid' });
    expect(priceBounds('abc', '')).toEqual({ minError: 'invalid' });
    expect(priceBounds('', '12.5')).toEqual({ maxError: 'invalid' });
    expect(priceBounds('', '100001')).toEqual({ maxError: 'tooHigh' });
  });

  it('refuses a maximum under the minimum on the maximum, which is then left out', () => {
    expect(priceBounds('50', '10')).toEqual({ min: 50, maxError: 'belowMin' });
    expect(priceBounds('10', '10')).toEqual({ min: 10, max: 10 });
  });
});
