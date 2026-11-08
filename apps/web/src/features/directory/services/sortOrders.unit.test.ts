import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { sortLabelOf, sortOrders } from './sortOrders';

describe('sortOrders', () => {
  it('offers the price orders only once a subscription is chosen: absent, not disabled, under «الكل»', () => {
    expect(sortOrders({ searching: false, period: undefined })).toEqual(['updated', 'name']);
    expect(sortOrders({ searching: true, period: undefined })).toEqual([
      'relevance',
      'updated',
      'name',
    ]);
    expect(sortOrders({ searching: false, period: 'MONTH' })).toEqual([
      'updated',
      'name',
      'priceAsc',
      'priceDesc',
    ]);
    expect(sortOrders({ searching: true, period: 'DAY' })).toEqual([
      'relevance',
      'updated',
      'name',
      'priceAsc',
      'priceDesc',
    ]);
  });

  it('names a price order by the subscription’s price, in both languages', () => {
    const ar = CATALOGUES.ar.directory.sort;
    const en = CATALOGUES.en.directory.sort;
    expect(sortLabelOf('priceAsc', 'MONTH', ar)).toBe('الأرخص شهريًا');
    expect(sortLabelOf('priceDesc', 'MONTH', ar)).toBe('الأغلى شهريًا');
    expect(sortLabelOf('priceAsc', 'DAY', ar)).toBe('الأرخص يوميًا');
    expect(sortLabelOf('priceAsc', 'MONTH', en)).toBe('Monthly price: low to high');
    expect(sortLabelOf('priceDesc', 'HOUR', en)).toBe('Hourly price: high to low');
    expect(sortLabelOf('updated', undefined, ar)).toBe('الأحدث تحديثًا');
  });
});
