import { describe, expect, it } from 'vitest';
import { amenitiesInput, amenitiesValues, amenityIdsOf, sameAmenities } from './amenitiesForm';

const SPACE = {
  amenityIds: [3, 1],
  ownAmenities: [
    { nameAr: 'غرفة صلاة', nameEn: 'Prayer room' },
    { nameAr: 'خزائن', nameEn: null },
  ],
};

describe('amenitiesValues', () => {
  it('holds the ids in order of id, and a missing English name as empty', () => {
    expect(amenitiesValues(SPACE)).toEqual({
      amenityIds: [1, 3],
      ownAmenities: [
        { nameAr: 'غرفة صلاة', nameEn: 'Prayer room' },
        { nameAr: 'خزائن', nameEn: '' },
      ],
    });
  });
});

describe('amenitiesInput', () => {
  it('reads an English name left blank, spaces only included, as none', () => {
    expect(
      amenitiesInput({ amenityIds: [1], ownAmenities: [{ nameAr: 'خزائن', nameEn: '  ' }] }),
    ).toEqual({ amenityIds: [1], ownAmenities: [{ nameAr: 'خزائن', nameEn: null }] });
  });
});

describe('amenityIdsOf', () => {
  it('orders the ids ticked by id', () => {
    expect(amenityIdsOf([5, 1, 3])).toEqual([1, 3, 5]);
  });
});

describe('sameAmenities', () => {
  it('is the same group for the same amenities in another order', () => {
    expect(sameAmenities({ amenityIds: [1, 3], ownAmenities: SPACE.ownAmenities }, SPACE)).toBe(
      true,
    );
  });

  it('is another group for another set of amenities', () => {
    expect(sameAmenities({ amenityIds: [1], ownAmenities: SPACE.ownAmenities }, SPACE)).toBe(false);
  });

  it('is another group for its own amenities in another order', () => {
    expect(
      sameAmenities({ amenityIds: [3, 1], ownAmenities: [...SPACE.ownAmenities].reverse() }, SPACE),
    ).toBe(false);
  });

  it('reads an own amenity with no English name as one with none', () => {
    expect(
      sameAmenities(
        {
          amenityIds: [3, 1],
          ownAmenities: [
            { nameAr: 'غرفة صلاة', nameEn: 'Prayer room' },
            { nameAr: 'خزائن', nameEn: undefined },
          ],
        },
        SPACE,
      ),
    ).toBe(true);
  });
});
