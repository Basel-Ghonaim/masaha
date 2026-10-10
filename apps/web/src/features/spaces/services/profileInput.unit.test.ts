import { describe, expect, it } from 'vitest';
import type { ProfileValues } from '../types/ProfileValues';
import { profileInput } from './profileInput';

const EMPTY: ProfileValues = {
  nameAr: '',
  nameEn: '',
  descriptionAr: '',
  descriptionEn: '',
  areaId: null,
  addressAr: '',
  addressEn: '',
  landmarkAr: '',
  landmarkEn: '',
  location: '',
};

describe('profileInput', () => {
  it('leaves out every optional text left blank, spaces only included, and the area not chosen', () => {
    expect(
      profileInput({
        ...EMPTY,
        nameAr: '   ',
        descriptionEn: '\n',
        landmarkAr: ' ',
        addressEn: '',
      }),
    ).toEqual({ nameEn: '', addressAr: '' });
  });

  it('keeps the required texts as typed, empty ones included, so the schema says they are short', () => {
    expect(profileInput({ ...EMPTY, nameEn: '  ', addressAr: 'شارع النصر' })).toEqual({
      nameEn: '  ',
      addressAr: 'شارع النصر',
    });
  });

  it('keeps every text that holds something, and the area chosen', () => {
    const values: ProfileValues = {
      nameAr: 'فوكس هب',
      nameEn: 'Focus Hub',
      descriptionAr: 'مساحة هادئة',
      descriptionEn: 'A quiet space',
      areaId: 11,
      addressAr: 'شارع النصر',
      addressEn: 'An-Nasr Street',
      landmarkAr: 'قرب المفترق',
      landmarkEn: 'Near the junction',
      location: '31.52, 34.45',
    };

    expect(profileInput(values)).toEqual({ ...values, location: { lat: 31.52, lng: 34.45 } });
  });

  it('reads the coordinates as the pin, Arabic digits included', () => {
    expect(profileInput({ ...EMPTY, location: '٣١٫٥٢، ٣٤٫٤٥' }).location).toEqual({
      lat: 31.52,
      lng: 34.45,
    });
  });

  it('leaves the pin out while no coordinates are given, so the schema says it is required', () => {
    expect(profileInput({ ...EMPTY, location: '  ' })).not.toHaveProperty('location');
  });

  it('keeps coordinates it cannot read as their text, so the schema says they are malformed', () => {
    expect(profileInput({ ...EMPTY, location: '31.52' }).location).toBe('31.52');
  });
});
