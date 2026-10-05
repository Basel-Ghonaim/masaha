import { describe, expect, it } from 'vitest';

import { amenityKey } from './amenityKey.ts';

describe('amenityKey', () => {
  it.each([
    ['Internet', 'internet'],
    ['Hot drinks', 'hot_drinks'],
    ['Halls for rent', 'halls_for_rent'],
    ['Wi-Fi 24/7', 'wi_fi_24_7'],
    ['  Stable   power! ', 'stable_power'],
    ['Café & Snacks', 'cafe_snacks'],
    ['3D printer', '3d_printer'],
  ])('derives %j as %j', (nameEn, key) => {
    expect(amenityKey(nameEn)).toBe(key);
  });

  it.each(['قهوة', '—', '***'])('is empty for %j, which has no Latin letter or digit', (nameEn) => {
    expect(amenityKey(nameEn)).toBe('');
  });
});
