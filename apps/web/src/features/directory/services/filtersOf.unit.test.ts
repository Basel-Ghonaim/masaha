import { describe, expect, it } from 'vitest';
import type { DirectoryFilters } from '../types/DirectoryFilters';
import { filtersOf, paramsOf, searchOf } from './filtersOf';

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
  sort: undefined,
  page: 1,
  view: 'list',
};

const read = (address: string) => filtersOf(new URLSearchParams(address));

describe('filtersOf', () => {
  it('reads each filter from the address', () => {
    expect(read('')).toEqual(DEFAULTS);
    expect(
      read(
        'q=Focus&area=3,7,3&period=MONTH&min=10&max=30&open=1&evening=1&verified=1&students=1&friday=1&sort=name&page=2',
      ),
    ).toEqual({
      q: 'Focus',
      areas: [3, 7],
      period: 'MONTH',
      min: 10,
      max: 30,
      openNow: true,
      evening: true,
      verified: true,
      studentPrices: true,
      openFriday: true,
      sort: 'name',
      page: 2,
      view: 'list',
    });
    expect(read('q=Focus&sort=relevance')).toMatchObject({ q: 'Focus', sort: 'relevance' });
  });

  it('falls back to the default for each value the server would refuse', () => {
    const fiftyOne = Array.from({ length: 51 }, (_, index) => String(index + 1)).join(',');
    expect(read(`area=${fiftyOne}`).areas).toEqual([]);
    expect(read('area=3,x').areas).toEqual([]);
    expect(read('period=YEAR').period).toBeUndefined();
    expect(read('period=DAY&min=0').min).toBeUndefined();
    expect(read('period=DAY&max=abc').max).toBeUndefined();
    expect(read('period=DAY&max=100001').max).toBeUndefined();
    expect(read('period=DAY&max=100000').max).toBe(100_000);
    expect(read('period=DAY&min=50&max=10')).toMatchObject({ min: 50, max: undefined });
    expect(read('period=DAY&min=10&max=10')).toMatchObject({ min: 10, max: 10 });
    expect(read('open=true').openNow).toBe(false);
    expect(read('evening=yes').evening).toBe(false);
    expect(read('sort=relevance').sort).toBeUndefined();
    expect(read('sort=distance').sort).toBeUndefined();
    expect(read('page=0').page).toBe(1);
    expect(read('page=2.5').page).toBe(1);
    expect(read('view=grid').view).toBe('list');
  });

  it('reads the subscription alone, its bounds only with it, and a price order only with it', () => {
    expect(read('period=MONTH')).toEqual({ ...DEFAULTS, period: 'MONTH' });
    expect(read('min=10&max=30')).toEqual(DEFAULTS);
    expect(read('period=DAY&min=10')).toMatchObject({ period: 'DAY', min: 10 });
    expect(read('period=DAY&sort=priceAsc').sort).toBe('priceAsc');
    expect(read('period=DAY&sort=priceDesc').sort).toBe('priceDesc');
    expect(read('sort=priceAsc').sort).toBeUndefined();
    expect(read('sort=priceDesc&min=10').sort).toBeUndefined();
  });

  it('reads the retired available=1 and availableNow=true as nothing: an old link opens unfiltered', () => {
    expect(read('available=1')).toEqual(DEFAULTS);
    expect(read('availableNow=true')).toEqual(DEFAULTS);
  });

  it('reads and writes view=map, the list unwritten', () => {
    expect(read('view=map&verified=1')).toMatchObject({ view: 'map', verified: true });
    expect(paramsOf({ ...DEFAULTS, view: 'map', verified: true }).toString()).toBe(
      'verified=1&view=map',
    );
    expect(paramsOf({ ...DEFAULTS, view: 'list' }).toString()).toBe('');
  });

  it('keeps a search of diacritics only off the request, and says so', () => {
    expect(searchOf('َِ')).toEqual({ q: undefined, refused: true });
    expect(searchOf('ــ')).toEqual({ q: undefined, refused: true });
    expect(searchOf('  مساحة  ')).toEqual({ q: 'مساحة', refused: false });
    expect(searchOf('   ')).toEqual({ q: undefined, refused: false });
    expect(read('q=%D9%8E').q).toBeUndefined();
  });
});

describe('paramsOf', () => {
  it('writes no default into the address', () => {
    expect(paramsOf(DEFAULTS).toString()).toBe('');
    expect(paramsOf({ ...DEFAULTS, q: 'Focus', sort: 'relevance' }).toString()).toBe('q=Focus');
    expect(paramsOf({ ...DEFAULTS, page: 1, sort: 'updated' }).toString()).toBe('');
  });

  it('writes what differs from the defaults, the budget with its period', () => {
    expect(
      paramsOf({
        ...DEFAULTS,
        q: 'Focus',
        areas: [3, 7],
        period: 'WEEK',
        max: 30,
        openNow: true,
        evening: true,
        verified: true,
        sort: 'updated',
        page: 2,
      }).toString(),
    ).toBe('q=Focus&area=3%2C7&period=WEEK&max=30&open=1&evening=1&verified=1&sort=updated&page=2');
  });

  it('writes the subscription alone, its bounds and a price order only with it', () => {
    expect(paramsOf({ ...DEFAULTS, period: 'MONTH' }).toString()).toBe('period=MONTH');
    expect(paramsOf({ ...DEFAULTS, min: 10, max: 30 }).toString()).toBe('');
    expect(paramsOf({ ...DEFAULTS, period: 'DAY', sort: 'priceAsc' }).toString()).toBe(
      'period=DAY&sort=priceAsc',
    );
    expect(paramsOf({ ...DEFAULTS, sort: 'priceDesc' }).toString()).toBe('');
  });

  it('reads back what it writes, and an old shared link still reads', () => {
    const filters: DirectoryFilters = {
      ...DEFAULTS,
      q: 'Hub',
      areas: [3],
      period: 'MONTH',
      min: 100,
      max: 400,
      openNow: true,
      evening: true,
      openFriday: true,
      verified: true,
      studentPrices: true,
      sort: 'priceDesc',
      page: 3,
      view: 'map',
    };
    expect(read(paramsOf(filters).toString())).toEqual(filters);
    expect(read('period=DAY&min=10')).toEqual({ ...DEFAULTS, period: 'DAY', min: 10 });
  });
});
