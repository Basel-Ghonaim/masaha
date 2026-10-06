import type { AdminSpaceRow, AdminSpacesQuery } from '@masaha/shared/space-links';

import type { LookupsService } from '../../lookups/index.ts';
import type { ListingService } from '../../spaces/index.ts';
import type { UsersService } from '../../users/index.ts';
import { createSpaceLinksRepository } from '../space-links.repository.ts';
import { toAdminSpaceRow } from './adminSpaces.mapper.ts';
import { listingQueryOf } from './listingQuery.ts';

interface Dependencies {
  listing: ListingService;
  lookups: LookupsService;
  users: UsersService;
}

/**
 * The admin's spaces list, composed here because it shows and filters by the spaces' owners
 * (conventions §9, Composed reads). Each filter on another module's value is resolved to ids first,
 * by its owner, in one query; `spaces` then applies its own filters and paginates; the page's
 * owners, their names and its areas' names follow, one query per module.
 */
export function createAdminSpacesService({ listing, lookups, users }: Dependencies) {
  const repository = createSpaceLinksRepository();
  return {
    async list(query: AdminSpacesQuery): Promise<{ rows: AdminSpaceRow[]; total: number }> {
      const byLinks = query.status === 'verified' || query.status === 'unverified';
      const [verifiedIds, governorateAreaIds] = await Promise.all([
        byLinks ? repository.findVerifiedSpaceIds() : undefined,
        query.governorateId === undefined ? undefined : lookups.areaIdsOf(query.governorateId),
      ]);
      const { rows, total } = await listing.page(
        listingQueryOf(query, { verifiedIds, governorateAreaIds }),
        query,
      );
      if (rows.length === 0) return { rows: [], total };

      const [links, areas] = await Promise.all([
        repository.findOwnerLinks(rows.map(({ id }) => id)),
        lookups.areaNamesFor([...new Set(rows.map(({ areaId }) => areaId))]),
      ]);
      const names =
        links.length === 0
          ? []
          : await users.namesFor([...new Set(links.map(({ userId }) => userId))]);

      const nameById = new Map(names.map(({ id, name }) => [id, name]));
      const areaById = new Map(areas.map((area) => [area.id, area]));
      return {
        rows: rows.flatMap((space) => {
          // Its area always exists (a foreign key).
          const area = areaById.get(space.areaId);
          const owners = links
            .filter(({ spaceId }) => spaceId === space.id)
            .map(({ userId }) => ({ id: userId, name: nameById.get(userId) ?? '' }));
          return area ? [toAdminSpaceRow(space, area, owners)] : [];
        }),
        total,
      };
    },
  };
}

export type AdminSpacesService = ReturnType<typeof createAdminSpacesService>;
