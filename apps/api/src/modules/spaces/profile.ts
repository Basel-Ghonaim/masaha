import type { CreateSpaceRequest, UpdateSpaceProfileRequest } from '@masaha/shared/spaces';

import type { AuditValues } from '../../shared/audit/index.ts';
import type { ProfileData } from './space/space.repository.ts';

// A space's profile as the requests carry it (the pin as one location) and as it is stored (its two
// columns), and as an audit entry records it.

/** The profile a create request describes; an absent optional field is none. */
export function toProfileData(request: CreateSpaceRequest): ProfileData {
  return {
    nameEn: request.nameEn,
    nameAr: request.nameAr ?? null,
    descriptionAr: request.descriptionAr ?? null,
    descriptionEn: request.descriptionEn ?? null,
    areaId: request.areaId,
    addressAr: request.addressAr,
    addressEn: request.addressEn ?? null,
    landmarkAr: request.landmarkAr ?? null,
    landmarkEn: request.landmarkEn ?? null,
    lat: request.location.lat,
    lng: request.location.lng,
  };
}

/** The profile's fields as an audit entry's values. */
export function profileValues(profile: Partial<ProfileData>): AuditValues {
  return { ...profile };
}

/** What a profile edit changes, and what its audit entry records of it. */
export interface ProfileChange {
  /** Only the fields set to a new value. */
  data: Partial<ProfileData>;
  /** Those fields, as they were. */
  before: AuditValues;
  /** Those fields, as they become. */
  after: AuditValues;
}

/**
 * What a profile edit changes: a field the edit sets to a value other than the current one. An
 * absent field is kept, and `null` clears an optional one; the pin is compared coordinate by
 * coordinate. An edit that changes nothing has empty `data`.
 */
export function profileChange(
  current: ProfileData,
  edit: UpdateSpaceProfileRequest,
): ProfileChange {
  const { location, ...fields } = edit;
  const requested: Partial<ProfileData> = { ...fields, ...location };
  const changed = (Object.keys(requested) as (keyof ProfileData)[]).filter(
    (field) => requested[field] !== undefined && requested[field] !== current[field],
  );
  const pick = (from: Partial<ProfileData>) =>
    Object.fromEntries(changed.map((field) => [field, from[field]])) as Partial<ProfileData>;
  const data = pick(requested);
  return { data, before: profileValues(pick(current)), after: profileValues(data) };
}
