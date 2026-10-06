import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { createSpaceSchema } from './requests.ts';

const SPACE = {
  nameEn: 'Focus Hub',
  areaId: 3,
  addressAr: 'شارع الشهداء',
  location: { lat: 31.52, lng: 34.45 },
};

/** The field errors a create request fails with, or null when it passes. */
function errorsOf(body: object) {
  const result = createSpaceSchema.safeParse(body);
  return result.success ? null : toFieldErrors(result.error.issues, body);
}

describe('createSpaceSchema', () => {
  it('takes a space with only its English name, its area, its Arabic address and its pin', () => {
    expect(createSpaceSchema.parse(SPACE)).toEqual(SPACE);
  });

  it('requires the English name and leaves the Arabic one optional', () => {
    expect(errorsOf({ ...SPACE, nameEn: undefined })).toEqual({ nameEn: ['required'] });
    expect(errorsOf({ ...SPACE, nameAr: null })).toBeNull();
    expect(errorsOf({ ...SPACE, nameAr: 'فوكس هب' })).toBeNull();
  });

  it('requires the Arabic address and leaves the English one and both landmarks optional', () => {
    expect(errorsOf({ ...SPACE, addressAr: undefined })).toEqual({ addressAr: ['required'] });
    expect(errorsOf({ ...SPACE, addressEn: null, landmarkAr: null, landmarkEn: null })).toBeNull();
  });

  it('lets a description break lines, and a name not', () => {
    expect(createSpaceSchema.parse({ ...SPACE, descriptionEn: 'Quiet.\nDesks.' })).toMatchObject({
      descriptionEn: 'Quiet.\nDesks.',
    });
    expect(errorsOf({ ...SPACE, nameEn: 'Focus\nHub' })).toEqual({ nameEn: ['invalid_format'] });
  });

  it('refuses a pin outside the Gaza Strip on the location as a whole', () => {
    expect(errorsOf({ ...SPACE, location: { lat: 31.9, lng: 35.2 } })).toEqual({
      location: ['out_of_range'],
    });
  });

  it('requires the pin', () => {
    expect(errorsOf({ ...SPACE, location: undefined })).toEqual({ location: ['required'] });
  });

  it('refuses an empty text rather than taking it for none', () => {
    expect(errorsOf({ ...SPACE, nameAr: ' ' })).toEqual({ nameAr: ['too_short'] });
  });
});
