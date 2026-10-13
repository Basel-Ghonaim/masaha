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
 * The fields of an edited profile that differ from the space's: what its save sends, so a field left
 * as it was is never sent again (an area hidden since would be refused), nor one another admin has
 * changed meanwhile. The pin counts as moved only once its coordinates, as the form shows them,
 * differ. An empty answer means nothing changed.
 */
export function profileChanges(
  profile: CreateSpaceRequest,
  space: SpaceProfile,
): UpdateSpaceProfileRequest {
  const changes: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(profile) as [keyof CreateSpaceRequest, unknown][]) {
    const before = space[field];
    const same =
      field === 'location'
        ? formatCoordinates(profile.location) === formatCoordinates(space.location)
        : (value ?? null) === (before ?? null);
    if (!same) changes[field] = value ?? null;
  }
  return changes;
}
