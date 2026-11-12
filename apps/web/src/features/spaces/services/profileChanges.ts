import type {
  AdminSpace,
  CreateSpaceRequest,
  UpdateSpaceProfileRequest,
} from '@masaha/shared/spaces';
import { formatCoordinates } from '@shared/map';

/** A space's profile: the fields its form edits, as the server holds them. */
export type SpaceProfile = Pick<AdminSpace, keyof CreateSpaceRequest>;

/** A space's profile alone, its other facts left out. */
export function profileOf(space: SpaceProfile): SpaceProfile {
  const {
    nameEn,
    nameAr,
    descriptionAr,
    descriptionEn,
    areaId,
    addressAr,
    addressEn,
    landmarkAr,
    landmarkEn,
    location,
  } = space;
  return {
    nameEn,
    nameAr,
    descriptionAr,
    descriptionEn,
    areaId,
    addressAr,
    addressEn,
    landmarkAr,
    landmarkEn,
    location,
  };
}

/**
 * Each section's own fields of the profile (B2/L2): «عن المساحة»'s names and descriptions, «الموقع»'s
 * the area, the addresses, the landmarks and the pin.
 */
const PART_FIELDS = {
  about: ['nameEn', 'nameAr', 'descriptionAr', 'descriptionEn'],
  location: ['areaId', 'addressAr', 'addressEn', 'landmarkAr', 'landmarkEn', 'location'],
} as const satisfies Record<'about' | 'location', readonly (keyof CreateSpaceRequest)[]>;

/**
 * The fields of a section's part of an edited profile (`part`) that differ from the profile it was
 * filled from (`before`): what its save sends, so a field left as it was is never sent again (an area
 * hidden since would be refused), nor one another admin has changed meanwhile, nor any of the other
 * section's. The pin counts as moved only once its coordinates, as the form shows them, differ. An
 * empty answer means nothing changed.
 */
export function profileChanges(
  profile: CreateSpaceRequest,
  before: SpaceProfile,
  part: 'about' | 'location',
): UpdateSpaceProfileRequest {
  const changes: Record<string, unknown> = {};
  for (const field of PART_FIELDS[part]) {
    const value = profile[field];
    const was = before[field];
    const same =
      field === 'location'
        ? formatCoordinates(profile.location) === formatCoordinates(before.location)
        : (value ?? null) === (was ?? null);
    if (!same) changes[field] = value ?? null;
  }
  return changes;
}
