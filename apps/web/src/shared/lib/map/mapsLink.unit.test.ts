import { describe, expect, it } from 'vitest';
import { mapsLink } from './mapsLink';

describe('mapsLink', () => {
  it('searches Google Maps for the point, latitude first', () => {
    expect(mapsLink({ lat: 31.5017, lng: 34.4668 })).toBe(
      'https://www.google.com/maps/search/?api=1&query=31.5017,34.4668',
    );
  });
});
