import type { AdminSpace } from '@masaha/shared/spaces';

import type { SpaceFacts } from '../facts/facts.ts';
import { groupDatesOf, missingGroups, staleGroups, type GroupCutoffs } from '../staleness.ts';
import type { SpaceRecord } from './space.repository.ts';

/** The space as the admin sees it, with its facts; `cutoffs` are the staleness cut-offs now. */
export function toAdminSpace(
  space: SpaceRecord,
  { isVerified, cutoffs, facts }: { isVerified: boolean; cutoffs: GroupCutoffs; facts: SpaceFacts },
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
      profile: dates.profile?.toISOString() ?? null,
      hours: dates.hours?.toISOString() ?? null,
      prices: dates.prices?.toISOString() ?? null,
      amenities: dates.amenities?.toISOString() ?? null,
      contacts: dates.contacts?.toISOString() ?? null,
    },
    staleGroups: staleGroups(dates, cutoffs),
    missingGroups: missingGroups(dates),
    hours: facts.hours,
  };
}
