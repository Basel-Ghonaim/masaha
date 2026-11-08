import { describe, expect, it } from 'vitest';
import { pricePlaceholders } from './pricePlaceholders';

describe('pricePlaceholders', () => {
  it('hints in whole shekels, the lowest rounded down and the highest up', () => {
    expect(pricePlaceholders({ minAgorot: 1250, maxAgorot: 9950 })).toEqual({
      min: '12',
      max: '100',
    });
    expect(pricePlaceholders({ minAgorot: 1500, maxAgorot: 1500 })).toEqual({
      min: '15',
      max: '15',
    });
    expect(pricePlaceholders({ minAgorot: 1, maxAgorot: 10_000_000 })).toEqual({
      min: '1',
      max: '100000',
    });
    // Under ₪1 the lowest hints «1», never «0», which a bound refuses.
    expect(pricePlaceholders({ minAgorot: 50, maxAgorot: 99 })).toEqual({ min: '1', max: '1' });
  });

  it('hints nothing for a subscription no space prices, or before the ranges arrive', () => {
    expect(pricePlaceholders(null)).toEqual({ min: '', max: '' });
    expect(pricePlaceholders(undefined)).toEqual({ min: '', max: '' });
  });
});
