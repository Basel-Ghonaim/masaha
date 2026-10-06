import type { CreateSpaceRequest } from '@masaha/shared/spaces';

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
