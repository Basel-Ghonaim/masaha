import { describe, expect, it } from 'vitest';
import type { DirectoryFilters } from '../types/DirectoryFilters';
import { requestOf } from './requestOf';

const DEFAULTS: DirectoryFilters = {
  q: undefined,
  areas: [],
  period: undefined,
  min: undefined,
  max: undefined,
  openNow: false,
  evening: false,
  verified: false,
  studentPrices: false,
  openFriday: false,
  womensHall: false,
  sort: undefined,
  page: 1,
  view: 'list',
};

describe('requestOf', () => {
  it('asks in agorot, the period alone, only the true flags, and the language only to order by name', () => {
    expect(requestOf(DEFAULTS, 'ar')).toEqual({ limit: 18 });
    expect(requestOf({ ...DEFAULTS, period: 'MONTH' }, 'ar')).toEqual({
      limit: 18,
      period: 'MONTH',
    });
    expect(requestOf({ ...DEFAULTS, period: 'DAY', sort: 'priceAsc' }, 'ar')).toEqual({
      limit: 18,
      period: 'DAY',
      sort: 'priceAsc',
    });
    // A bound without its subscription never reaches the request.
    expect(requestOf({ ...DEFAULTS, min: 10 }, 'ar')).toEqual({ limit: 18 });
    expect(
      requestOf(
        {
          ...DEFAULTS,
          q: 'Focus',
          areas: [3, 7],
          period: 'WEEK',
          min: 10,
          max: 30,
          verified: true,
          openNow: true,
          evening: true,
          womensHall: true,
          sort: 'relevance',
          page: 3,
        },
        'en',
      ),
    ).toEqual({
      limit: 18,
      q: 'Focus',
      area: '3,7',
      period: 'WEEK',
      priceMin: 1000,
      priceMax: 3000,
      verified: true,
      openNow: true,
      evening: true,
      womensHall: true,
      sort: 'relevance',
      page: 3,
    });
    expect(
      requestOf({ ...DEFAULTS, studentPrices: true, openFriday: true, sort: 'name' }, 'en'),
    ).toEqual({ limit: 18, studentPrices: true, openFriday: true, sort: 'name', lang: 'en' });
  });

  it('orders by distance, with no language, while near me sorts the list', () => {
    expect(requestOf({ ...DEFAULTS, sort: 'name', page: 2 }, 'en', { byDistance: true })).toEqual({
      limit: 18,
      sort: 'distance',
      page: 2,
    });
  });
});
