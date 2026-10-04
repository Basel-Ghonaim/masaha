import type { ManagedSpace } from '@masaha/shared/space-links';

import type { AreaName } from '../lookups/index.ts';
import type { SpaceRow } from '../spaces/index.ts';
import type { ActiveLink } from './space-links.repository.ts';

/** One of the user's spaces as their list shows it: the link's role, the space and its area. */
export function toManagedSpace(link: ActiveLink, space: SpaceRow, area: AreaName): ManagedSpace {
  return {
    spaceId: link.spaceId,
    role: link.role,
    slug: space.slug,
    nameAr: space.nameAr,
    nameEn: space.nameEn,
    area: { nameAr: area.nameAr, nameEn: area.nameEn },
  };
}
