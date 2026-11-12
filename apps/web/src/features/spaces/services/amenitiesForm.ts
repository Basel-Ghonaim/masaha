import type { AdminSpace, UpdateSpaceAmenitiesRequest } from '@masaha/shared/spaces';

/** The amenities group as its form holds it: the ids ticked, in order of id, and the own names. */
export type AmenitiesValues = {
  amenityIds: number[];
  ownAmenities: { nameAr: string; nameEn: string }[];
};

const byId = (ids: readonly number[]) => [...ids].sort((first, second) => first - second);

/** A space's amenities as their form holds them: the ids in order of id, a missing name as empty. */
export function amenitiesValues(
  space: Pick<AdminSpace, 'amenityIds' | 'ownAmenities'>,
): AmenitiesValues {
  return {
    amenityIds: byId(space.amenityIds),
    ownAmenities: space.ownAmenities.map((own) => ({
      nameAr: own.nameAr,
      nameEn: own.nameEn ?? '',
    })),
  };
}

/** The group the contract's schema reads: an own amenity's English name left blank is none. */
export function amenitiesInput(values: AmenitiesValues): Record<string, unknown> {
  return {
    amenityIds: values.amenityIds,
    ownAmenities: values.ownAmenities.map((own) => ({
      nameAr: own.nameAr,
      nameEn: own.nameEn.trim() === '' ? null : own.nameEn,
    })),
  };
}

/**
 * Whether a group to save is the space's as it is: the same amenities, in any order, and the same
 * own amenities in the same order (another order is a change).
 */
export function sameAmenities(
  request: UpdateSpaceAmenitiesRequest,
  space: Pick<AdminSpace, 'amenityIds' | 'ownAmenities'>,
): boolean {
  return (
    JSON.stringify(byId(request.amenityIds)) === JSON.stringify(byId(space.amenityIds)) &&
    JSON.stringify(request.ownAmenities.map((own) => [own.nameAr, own.nameEn ?? null])) ===
      JSON.stringify(space.ownAmenities.map((own) => [own.nameAr, own.nameEn]))
  );
}

/** The ids ticked, in order of id, so a change of order alone is no change. */
export function amenityIdsOf(ids: readonly number[]): number[] {
  return byId(ids);
}

/** A catalogue amenity's two names, as the platform's list gives them. */
type CatalogueNames = { nameAr: string; nameEn: string };

const folded = (name: string) => name.trim().toLocaleLowerCase();

/**
 * The own amenities that name one of the platform's (A2), by their place: an Arabic or an English
 * name equal to either of a catalogue amenity's, trimmed and whatever its case. Checked in the
 * browser only, where both lists are shown (S4: the server refuses none).
 */
export function catalogueClashes(
  own: readonly { nameAr: string; nameEn: string }[],
  catalogue: readonly CatalogueNames[],
): number[] {
  const names = new Set(
    catalogue.flatMap(({ nameAr, nameEn }) => [folded(nameAr), folded(nameEn)]),
  );
  return own.flatMap((row, index) =>
    [row.nameAr, row.nameEn].some((name) => name.trim() !== '' && names.has(folded(name)))
      ? [index]
      : [],
  );
}
