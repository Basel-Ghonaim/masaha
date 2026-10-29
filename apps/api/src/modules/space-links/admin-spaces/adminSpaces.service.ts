import type { AdminSpaceRow, AdminSpacesListQuery } from '@masaha/shared/space-links';
import type { FactGroup } from '@masaha/shared/spaces';

import type { Tx } from '../../../db/index.ts';
import type { LookupsService } from '../../lookups/index.ts';
import type { ListingService } from '../../spaces/index.ts';
import type { UsersService } from '../../users/index.ts';
import { createSpaceLinksRepository } from '../space-links.repository.ts';
import { toAdminSpaceRow } from './adminSpaces.mapper.ts';
import { listingQueryOf } from './listingQuery.ts';

/** The spaces counted by status for the admin's overview, each the list's total by that filter. */
export interface SpaceCounts {
  verified: number;
  unverified: number;
  hidden: number;
  staleOrMissing: number;
}

/** The spaces whose facts the admin keeps, stale or missing: how many, and the first few. */
export interface StaleEditable {
  total: number;
  first: {
    id: number;
    nameEn: string;
    nameAr: string | null;
    hidden: boolean;
    missing: FactGroup[];
    stale: { group: FactGroup; days: number }[];
  }[];
}

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
    /**
     * Active owners of one space, oldest first; omitted when the user lookup returns no name
     * (the user was deleted or absent). Read with the caller's transaction, so under its lock and
     * on its connection.
     */
    async ownersFor(spaceId: number, tx: Tx): Promise<{ id: number; name: string }[]> {
      const links = await repository.findOwnerLinks([spaceId], tx);
      if (links.length === 0) return [];
      const names = await users.namesFor([...new Set(links.map(({ userId }) => userId))], tx);
      const nameById = new Map(names.map(({ id, name }) => [id, name]));
      return links.flatMap(({ userId }) => {
        const name = nameById.get(userId);
        return name !== undefined ? [{ id: userId, name }] : [];
      });
    },

    async list(query: AdminSpacesListQuery): Promise<{ rows: AdminSpaceRow[]; total: number }> {
      const byLinks =
        query.status === 'verified' || query.status === 'unverified' || query.status === 'editable';
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

    /**
     * The spaces by status, for the admin's overview: each the list's total by the same filter
     * (`listingQueryOf`), so a tile equals the list it links to (S22) — verified, unverified and
     * hidden as `status=` lists them, stale or missing as `stale=true` does; a deleted space never.
     * The verified ids read once; the four counts in parallel.
     */
    async counts(): Promise<SpaceCounts> {
      const verifiedIds = await repository.findVerifiedSpaceIds();
      const count = (query: Parameters<typeof listingQueryOf>[0]) =>
        listing.count(listingQueryOf(query, { verifiedIds }));
      const [verified, unverified, hidden, staleOrMissing] = await Promise.all([
        count({ status: 'verified' }),
        count({ status: 'unverified' }),
        count({ status: 'hidden' }),
        count({ stale: true }),
      ]);
      return { verified, unverified, hidden, staleOrMissing };
    },

    /**
     * The spaces whose facts the admin keeps — unverified, hidden ones included, never deleted —
     * with a group stale or missing: the first `take` by English name, then id, each with its
     * groups and their days, and how many there are. The list's `status=editable&stale=true`.
     */
    async staleEditable(take = 5): Promise<StaleEditable> {
      const verifiedIds = await repository.findVerifiedSpaceIds();
      const { rows, total } = await listing.page(
        listingQueryOf({ status: 'editable', stale: true }, { verifiedIds }),
        { page: 1, limit: take },
      );
      return {
        total,
        first: rows.map(({ id, nameEn, nameAr, isHidden, missingGroups, stale }) => ({
          id,
          nameEn,
          nameAr,
          hidden: isHidden,
          missing: missingGroups,
          stale,
        })),
      };
    },
  };
}

export type AdminSpacesService = ReturnType<typeof createAdminSpacesService>;
