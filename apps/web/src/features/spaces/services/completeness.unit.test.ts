import { describe, expect, it } from 'vitest';
import { NEW_SPACE, SPACE } from '../../../test/spaceFixtures';
import { completenessOf } from './completeness';

describe('completenessOf', () => {
  it('counts the seven sections a filled, fresh space has, and nothing to do', () => {
    expect(completenessOf(SPACE, 3)).toEqual({
      states: {
        photos: 'ok',
        prices: 'ok',
        hours: 'ok',
        shifts: 'ok',
        amenities: 'ok',
        about: 'ok',
        location: 'ok',
        contacts: 'ok',
      },
      done: 7,
      total: 7,
      issues: [],
    });
  });

  it('marks what a new space lacks missing, in the page’s order, the location always filled', () => {
    const { states, done, issues } = completenessOf(NEW_SPACE, 0);

    expect(issues).toEqual(['photos', 'prices', 'hours', 'amenities', 'about', 'contacts']);
    expect(states.location).toBe('ok');
    expect(done).toBe(1);
  });

  it('never counts the shifts: none is optional, not missing', () => {
    const { states, issues } = completenessOf(
      { ...SPACE, hours: { days: SPACE.hours?.days ?? [], shifts: [] } },
      3,
    );

    expect(states.shifts).toBe('optional');
    expect(issues).not.toContain('shifts');
  });

  it('counts «عن المساحة» by its Arabic description alone (X2), never by the names or the English', () => {
    const englishOnly = { ...SPACE, descriptionAr: null, descriptionEn: 'A quiet place.' };
    expect(completenessOf(englishOnly, 3).states.about).toBe('missing');
    expect(completenessOf({ ...SPACE, descriptionAr: '   ' }, 3).states.about).toBe('missing');
    expect(completenessOf(SPACE, 3).states.about).toBe('ok');
  });

  it('marks both sections of a stale group stale, and counts them done', () => {
    const { states, done, issues } = completenessOf(
      { ...SPACE, staleGroups: ['profile', 'hours'] },
      3,
    );

    expect([states.about, states.location, states.hours, states.shifts]).toEqual([
      'stale',
      'stale',
      'stale',
      'stale',
    ]);
    expect(done).toBe(7);
    expect(issues).toEqual(['hours', 'about', 'location']);
  });

  it('counts a group saved empty missing, its date notwithstanding (D2)', () => {
    const { states } = completenessOf({ ...SPACE, prices: [], contacts: [] }, 3);

    expect([states.prices, states.contacts]).toEqual(['missing', 'missing']);
  });

  it('counts an own amenity as an amenity, and the photos as one at least', () => {
    const own = { ...SPACE, amenityIds: [] };
    expect(completenessOf(own, 1).states.amenities).toBe('ok');
    expect(completenessOf({ ...own, ownAmenities: [] }, 1).states.amenities).toBe('missing');
    expect(completenessOf(SPACE, 0).states.photos).toBe('missing');
  });
});
