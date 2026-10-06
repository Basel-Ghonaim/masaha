import type { AdminSpaceRow } from '@masaha/shared/space-links';

import type { AreaName } from '../../lookups/index.ts';
import type { ListedSpace } from '../../spaces/index.ts';

/**
 * One row of the admin's list: the space, its area, and its state, `hidden` first, else `verified`
 * while it has an owner (data-model › Derived values).
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
    state: space.isHidden ? 'hidden' : owners.length > 0 ? 'verified' : 'unverified',
    owners,
    staleGroups: space.staleGroups,
    lastUpdatedAt: space.lastUpdatedAt.toISOString(),
  };
}
