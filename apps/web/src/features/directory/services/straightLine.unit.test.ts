import { describe, expect, it } from 'vitest';
import { straightLine } from './straightLine';

describe('straightLine', () => {
  it('the straight-line distance of a known pair, in metres', () => {
    // A hundredth of a degree of latitude is about 1,112 m anywhere.
    expect(Math.round(straightLine({ lat: 31.5, lng: 34.46 }, { lat: 31.51, lng: 34.46 }))).toBe(
      1112,
    );
    // Gaza City's Rimal to Khan Younis' centre: about 23.2 km.
    expect(
      Math.round(
        straightLine({ lat: 31.5204, lng: 34.4413 }, { lat: 31.3462, lng: 34.3063 }) / 100,
      ),
    ).toBe(232);
    expect(straightLine({ lat: 31.5, lng: 34.46 }, { lat: 31.5, lng: 34.46 })).toBe(0);
  });
});
