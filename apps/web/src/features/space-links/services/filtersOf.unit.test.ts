import { describe, expect, it } from 'vitest';
import type { AdminSpacesFilters } from '../types/AdminSpacesFilters';
import { filtersOf, paramsOf, requestOf } from './filtersOf';

const NONE: AdminSpacesFilters = { place: null, stale: false, page: 1 };

const read = (search: string) => filtersOf(new URLSearchParams(search));

describe('filtersOf', () => {
  it('reads nothing from an empty address: every space, the first page', () => {
    expect(read('')).toEqual(NONE);
  });

  it('reads each filter and the page', () => {
    expect(read('q=Hub&status=hidden&area=12&stale=true&page=3')).toEqual({
      q: 'Hub',
      status: 'hidden',
      place: { areaId: 12 },
      stale: true,
      page: 3,
    });
    expect(read('governorate=2')).toEqual({ ...NONE, place: { governorateId: 2 } });
  });

  it('trims the search, as the server does', () => {
    expect(read('q=%20Focus%20')).toEqual({ ...NONE, q: 'Focus' });
  });

  it('takes the area when the address names a governorate too', () => {
    expect(read('governorate=2&area=12')).toEqual({ ...NONE, place: { areaId: 12 } });
  });

  it.each([
    ['q=%20%20', 'an empty search'],
    [`q=${'a'.repeat(81)}`, 'a search past 80 characters'],
    ['status=closed', 'an unknown state'],
    ['area=0', 'an area that is not a positive id'],
    ['governorate=north', 'a governorate that is not an id'],
    ['stale=sometimes', 'a stale flag that is not one'],
    ['page=0', 'a page before the first'],
    ['page=two', 'a page that is not a number'],
  ])('falls back to the default for %s (%s)', (search) => {
    expect(read(search)).toEqual(NONE);
  });
});

describe('paramsOf', () => {
  it('leaves the defaults out of the address', () => {
    expect(paramsOf(NONE).toString()).toBe('');
  });

  it('writes each filter and the page, an area or a governorate', () => {
    expect(
      paramsOf({
        q: 'Hub',
        status: 'verified',
        place: { areaId: 12 },
        stale: true,
        page: 2,
      }).toString(),
    ).toBe('q=Hub&status=verified&area=12&stale=true&page=2');
    expect(paramsOf({ ...NONE, place: { governorateId: 2 } }).toString()).toBe('governorate=2');
  });

  it('reads back what it writes', () => {
    const filters: AdminSpacesFilters = {
      q: 'Focus Hub',
      status: 'unverified',
      place: { governorateId: 4 },
      stale: true,
      page: 5,
    };
    expect(filtersOf(paramsOf(filters))).toEqual(filters);
  });
});

describe('requestOf', () => {
  it('asks for the first page of every space when nothing is chosen', () => {
    expect(requestOf(NONE)).toEqual({ page: 1 });
  });

  it('names each filter as the contract does', () => {
    expect(
      requestOf({ q: 'Hub', status: 'hidden', place: { areaId: 12 }, stale: true, page: 2 }),
    ).toEqual({ q: 'Hub', status: 'hidden', areaId: 12, stale: true, page: 2 });
    expect(requestOf({ ...NONE, place: { governorateId: 2 } })).toEqual({
      governorateId: 2,
      page: 1,
    });
  });
});
