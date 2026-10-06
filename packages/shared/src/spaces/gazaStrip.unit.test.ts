import { describe, expect, it } from 'vitest';

import { GAZA_STRIP_BOUNDS, isInGazaStrip } from './gazaStrip.ts';

const { south, north, west, east } = GAZA_STRIP_BOUNDS;

describe('isInGazaStrip', () => {
  it.each([
    ['Gaza City', { lat: 31.5205, lng: 34.4535 }],
    ['Rafah, at the southern end', { lat: 31.28, lng: 34.25 }],
    ['Beit Hanoun, at the northern end', { lat: 31.54, lng: 34.54 }],
    ['the box’s corners, edges included', { lat: south, lng: west }],
    ['the opposite corner', { lat: north, lng: east }],
  ])('accepts %s', (_case, point) => {
    expect(isInGazaStrip(point)).toBe(true);
  });

  it.each([
    ['south of the box', { lat: south - 0.001, lng: 34.3 }],
    ['north of the box', { lat: north + 0.001, lng: 34.4 }],
    ['west of the box, at sea', { lat: 31.4, lng: west - 0.001 }],
    ['east of the box', { lat: 31.4, lng: east + 0.001 }],
    ['the point 0, 0', { lat: 0, lng: 0 }],
    ['the coordinates swapped', { lat: 34.45, lng: 31.52 }],
  ])('refuses a point %s', (_case, point) => {
    expect(isInGazaStrip(point)).toBe(false);
  });
});
