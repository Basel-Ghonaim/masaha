import type { AdminSpaceRow } from '@masaha/shared/space-links';

import type { AreaName } from '../../lookups/index.ts';
import type { ListedSpace } from '../../spaces/index.ts';

/**
 * One row of the admin's list: the space, its area, and its state as facts apart: hidden or not, and
 * verified while it has an owner (data-model › Derived values).
 */
export function toAdminSpaceRow(
  space: ListedSpace,
  area: AreaName,
  owners: { id: number; name: string }[],
): AdminSpaceRow {
  return {
    id: space.id,
    slug: space.slug,
    nameEn: space.nameEn,
    nameAr: space.nameAr,
    area: { id: area.id, nameAr: area.nameAr, nameEn: area.nameEn },
    isVerified: owners.length > 0,
    isHidden: space.isHidden,
    owners,
    staleGroups: space.staleGroups,
    missingGroups: space.missingGroups,
    lastUpdatedAt: space.lastUpdatedAt.toISOString(),
  };
}
