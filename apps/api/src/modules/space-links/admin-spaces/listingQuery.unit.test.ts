import { describe, expect, it } from 'vitest';

import { listingQueryOf } from './listingQuery.ts';

const PAGE = { page: 1, limit: 20 };

describe('listingQueryOf', () => {
  it('asks for every space when nothing filters', () => {
    expect(listingQueryOf(PAGE, {})).toEqual({});
  });

  it('keeps the verified spaces that are not hidden', () => {
    expect(listingQueryOf({ ...PAGE, status: 'verified' }, { verifiedIds: [3, 7] })).toEqual({
      ids: { in: [3, 7] },
      isHidden: false,
    });
  });

  it('keeps every space but the verified ones, not hidden, for unverified', () => {
    expect(listingQueryOf({ ...PAGE, status: 'unverified' }, { verifiedIds: [3] })).toEqual({
      ids: { notIn: [3] },
      isHidden: false,
    });
  });

  it('keeps no space for verified when none is', () => {
    expect(listingQueryOf({ ...PAGE, status: 'verified' }, {})).toEqual({
      ids: { in: [] },
      isHidden: false,
    });
  });

  it('keeps the hidden spaces, verified or not, for hidden', () => {
    expect(listingQueryOf({ ...PAGE, status: 'hidden' }, {})).toEqual({ isHidden: true });
  });

  it('keeps the governorate’s areas, or the one area asked', () => {
    expect(listingQueryOf(PAGE, { governorateAreaIds: [4, 5] })).toEqual({ areaIds: [4, 5] });
    expect(listingQueryOf({ ...PAGE, areaId: 9 }, {})).toEqual({ areaIds: [9] });
  });

  it('keeps the asked area only when it is one of the governorate’s, else none', () => {
    expect(listingQueryOf({ ...PAGE, areaId: 5 }, { governorateAreaIds: [4, 5] })).toEqual({
      areaIds: [5],
    });
    expect(listingQueryOf({ ...PAGE, areaId: 9 }, { governorateAreaIds: [4, 5] })).toEqual({
      areaIds: [],
    });
  });

  it('passes the search and "stale only" on to spaces, and nothing for stale=false', () => {
    expect(listingQueryOf({ ...PAGE, q: 'hub', stale: true }, {})).toEqual({
      q: 'hub',
      staleOnly: true,
    });
    expect(listingQueryOf({ ...PAGE, stale: false }, {})).toEqual({});
  });
});
