import type { AdminSpace } from '@masaha/shared/spaces';

import { groupDatesOf, staleGroups, type GroupDates } from '../staleness.ts';
import type { SpaceRecord } from './space.repository.ts';

/** The space as the admin sees it; `cutoffs` are the staleness cut-offs now. */
export function toAdminSpace(
  space: SpaceRecord,
  { isVerified, cutoffs }: { isVerified: boolean; cutoffs: GroupDates },
): AdminSpace {
  const dates = groupDatesOf(space);
  return {
    id: space.id,
    slug: space.slug,
    nameEn: space.nameEn,
    nameAr: space.nameAr,
    descriptionAr: space.descriptionAr,
    descriptionEn: space.descriptionEn,
    areaId: space.areaId,
    addressAr: space.addressAr,
    addressEn: space.addressEn,
    landmarkAr: space.landmarkAr,
    landmarkEn: space.landmarkEn,
    location: { lat: space.lat, lng: space.lng },
    isHidden: space.isHidden,
    isVerified,
    updatedAt: {
      profile: dates.profile.toISOString(),
      hours: dates.hours.toISOString(),
      prices: dates.prices.toISOString(),
      amenities: dates.amenities.toISOString(),
      contacts: dates.contacts.toISOString(),
    },
    staleGroups: staleGroups(dates, cutoffs),
  };
}
