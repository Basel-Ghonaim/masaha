import { describe, expect, it } from 'vitest';

import { profileChange, toProfileData } from './profile.ts';
import type { ProfileData } from './space/space.repository.ts';

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

const CURRENT: ProfileData = {
  nameEn: 'Focus Hub',
  nameAr: 'فوكس هب',
  descriptionAr: null,
  descriptionEn: 'Quiet.',
  areaId: 3,
  addressAr: 'شارع الشهداء',
  addressEn: null,
  landmarkAr: null,
  landmarkEn: 'Near the clinic',
  lat: 31.52,
  lng: 34.45,
};

describe('profileChange', () => {
  it('changes only the fields set to a new value, and records them before and after', () => {
    expect(
      profileChange(CURRENT, { nameEn: 'Focus Hub', nameAr: null, landmarkEn: 'Near the park' }),
    ).toEqual({
      data: { nameAr: null, landmarkEn: 'Near the park' },
      before: { nameAr: 'فوكس هب', landmarkEn: 'Near the clinic' },
      after: { nameAr: null, landmarkEn: 'Near the park' },
    });
  });

  it('compares the pin coordinate by coordinate', () => {
    expect(profileChange(CURRENT, { location: { lat: 31.52, lng: 34.46 } })).toEqual({
      data: { lng: 34.46 },
      before: { lng: 34.45 },
      after: { lng: 34.46 },
    });
  });

  it('changes nothing for an edit of nothing, or of the same values', () => {
    expect(profileChange(CURRENT, {}).data).toEqual({});
    expect(
      profileChange(CURRENT, { addressAr: 'شارع الشهداء', location: { lat: 31.52, lng: 34.45 } })
        .data,
    ).toEqual({});
  });
});
