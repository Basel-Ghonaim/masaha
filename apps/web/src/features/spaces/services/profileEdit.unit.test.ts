import type { AdminSpace, CreateSpaceRequest } from '@masaha/shared/spaces';
import { describe, expect, it } from 'vitest';
import type { ProfileValues } from '../types/ProfileValues';
import { profileChanges } from './profileChanges';
import { profileEditInput } from './profileEditInput';
import { profileValues } from './profileValues';

const SPACE = {
  nameEn: 'Focus Hub',
  nameAr: null,
  descriptionAr: 'مساحة هادئة',
  descriptionEn: null,
  areaId: 11,
  addressAr: 'شارع النصر',
  addressEn: null,
  landmarkAr: 'قرب المفترق',
  landmarkEn: null,
  location: { lat: 31.5195034, lng: 34.4470012 },
} satisfies Partial<AdminSpace>;

const VALUES: ProfileValues = {
  nameAr: '',
  nameEn: 'Focus Hub',
  descriptionAr: 'مساحة هادئة',
  descriptionEn: '',
  areaId: 11,
  addressAr: 'شارع النصر',
  addressEn: '',
  landmarkAr: 'قرب المفترق',
  landmarkEn: '',
  location: '31.51950, 34.44700',
};

describe('profileValues', () => {
  it('holds a space’s profile as its form does: no text as empty, the pin as its coordinates', () => {
    expect(profileValues(SPACE)).toEqual(VALUES);
  });
});

describe('profileEditInput', () => {
  it('sends an optional text left blank as null, which clears it, and keeps the required as typed', () => {
    expect(profileEditInput({ ...VALUES, nameEn: '', landmarkAr: '  ' })).toEqual({
      nameEn: '',
      nameAr: null,
      descriptionAr: 'مساحة هادئة',
      descriptionEn: null,
      areaId: 11,
      addressAr: 'شارع النصر',
      addressEn: null,
      landmarkAr: null,
      landmarkEn: null,
      location: { lat: 31.5195, lng: 34.447 },
    });
  });

  it('leaves out the pin while there is none, so the schema asks for it', () => {
    expect(profileEditInput({ ...VALUES, location: ' ' })).not.toHaveProperty('location');
  });
});

describe('profileChanges', () => {
  const unchanged: CreateSpaceRequest = {
    ...SPACE,
    location: { lat: 31.5195, lng: 34.447 },
  };

  it('is nothing for a profile as the space has it, its pin read to the coordinates shown', () => {
    expect(profileChanges(unchanged, SPACE)).toEqual({});
  });

  it('is only the fields that changed, a cleared one as null', () => {
    expect(
      profileChanges({ ...unchanged, nameEn: 'Focus Hub 2', landmarkAr: null }, SPACE),
    ).toEqual({ nameEn: 'Focus Hub 2', landmarkAr: null });
  });

  it('holds the pin once it has moved', () => {
    expect(profileChanges({ ...unchanged, location: { lat: 31.52, lng: 34.447 } }, SPACE)).toEqual({
      location: { lat: 31.52, lng: 34.447 },
    });
  });
});
