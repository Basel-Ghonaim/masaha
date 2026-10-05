import type { AdminAmenity, AmenityIconKey } from '@masaha/shared/lookups';

import type { AmenityRow } from './amenities.repository.ts';

export function toAdminAmenity(amenity: AmenityRow): AdminAmenity {
  return {
    id: amenity.id,
    key: amenity.key,
    nameAr: amenity.nameAr,
    nameEn: amenity.nameEn,
    // Written only from AMENITY_ICON_KEYS: by the seed, typed by it, and by the validated requests.
    icon: amenity.icon as AmenityIconKey,
    isActive: amenity.isActive,
    isFilterable: amenity.isFilterable,
  };
}
