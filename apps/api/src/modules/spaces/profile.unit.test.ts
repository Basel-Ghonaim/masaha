import { describe, expect, it } from 'vitest';

import { toProfileData } from './profile.ts';

describe('toProfileData', () => {
  it('stores an absent optional field as none, and the pin as its two coordinates', () => {
    expect(
      toProfileData({
        nameEn: 'Focus Hub',
        areaId: 3,
        addressAr: 'شارع الشهداء',
        addressEn: null,
        location: { lat: 31.52, lng: 34.45 },
      }),
    ).toEqual({
      nameEn: 'Focus Hub',
      nameAr: null,
      descriptionAr: null,
      descriptionEn: null,
      areaId: 3,
      addressAr: 'شارع الشهداء',
      addressEn: null,
      landmarkAr: null,
      landmarkEn: null,
      lat: 31.52,
      lng: 34.45,
    });
  });
});
