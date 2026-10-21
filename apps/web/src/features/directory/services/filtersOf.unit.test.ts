import { describe, expect, it } from 'vitest';
import type { DirectoryFilters } from '../types/DirectoryFilters';
import { filtersOf, paramsOf, searchOf } from './filtersOf';

const DEFAULTS: DirectoryFilters = {
  q: undefined,
  areas: [],
  period: 'DAY',
  min: undefined,
  max: undefined,
  availableNow: false,
  verified: false,
  studentPrices: false,
  openFriday: false,
  sort: undefined,
  page: 1,
};

const read = (address: string) => filtersOf(new URLSearchParams(address));

describe('filtersOf', () => {
  it('reads each filter from the address', () => {
    expect(read('')).toEqual(DEFAULTS);
    expect(
      read(
        'q=Focus&area=3,7,3&period=MONTH&min=10&max=30&available=1&verified=1&students=1&friday=1&sort=name&page=2',
      ),
    ).toEqual({
      q: 'Focus',
      areas: [3, 7],
      period: 'MONTH',
      min: 10,
      max: 30,
      availableNow: true,
      verified: true,
      studentPrices: true,
      openFriday: true,
      sort: 'name',
      page: 2,
    });
    expect(read('q=Focus&sort=relevance')).toMatchObject({ q: 'Focus', sort: 'relevance' });
  });

  it('falls back to the default for each value the server would refuse', () => {
    const fiftyOne = Array.from({ length: 51 }, (_, index) => String(index + 1)).join(',');
    expect(read(`area=${fiftyOne}`).areas).toEqual([]);
    expect(read('area=3,x').areas).toEqual([]);
    expect(read('period=YEAR').period).toBe('DAY');
    expect(read('min=0').min).toBeUndefined();
    expect(read('max=abc').max).toBeUndefined();
    expect(read('max=100001').max).toBeUndefined();
    expect(read('max=100000').max).toBe(100_000);
    expect(read('min=50&max=10')).toMatchObject({ min: 50, max: undefined });
    expect(read('min=10&max=10')).toMatchObject({ min: 10, max: 10 });
    expect(read('available=true').availableNow).toBe(false);
    expect(read('sort=relevance').sort).toBeUndefined();
    expect(read('sort=distance').sort).toBeUndefined();
    expect(read('page=0').page).toBe(1);
    expect(read('page=2.5').page).toBe(1);
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
    expect(paramsOf({ ...DEFAULTS, period: 'MONTH' }).toString()).toBe('');
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
        verified: true,
        sort: 'updated',
        page: 2,
      }).toString(),
    ).toBe('q=Focus&area=3%2C7&period=WEEK&max=30&verified=1&sort=updated&page=2');
    expect(paramsOf({ ...DEFAULTS, min: 10 }).toString()).toBe('period=DAY&min=10');
  });
});
