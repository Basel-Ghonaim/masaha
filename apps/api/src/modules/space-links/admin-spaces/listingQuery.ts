import type { AdminSpacesQuery } from '@masaha/shared/space-links';

import type { ListingQuery } from '../../spaces/index.ts';

/** The filters other modules resolved to ids, before `spaces` pages the list. */
export interface ResolvedFilters {
  /** Every verified space, when the status asks for verified or unverified ones. */
  verifiedIds?: readonly number[];
  /** The governorate's areas, when the list is filtered by a governorate. */
  governorateAreaIds?: readonly number[];
}

/**
 * The admin's list query as `spaces` applies it (conventions §5, §9). Verified and unverified are a
 * space's ids from its links, and both leave hidden spaces out, since a hidden space's state is
 * hidden whatever its owners; an area within a governorate narrows to that area, or to none when it
 * is not one of the governorate's.
 */
export function listingQueryOf(
  { status, areaId, q, stale }: AdminSpacesQuery,
  { verifiedIds = [], governorateAreaIds }: ResolvedFilters,
): ListingQuery {
  const areaIds =
    areaId === undefined
      ? governorateAreaIds
      : (governorateAreaIds ?? [areaId]).filter((id) => id === areaId);
  return {
    ...(status === 'verified' && { ids: { in: verifiedIds }, isHidden: false }),
    ...(status === 'unverified' && { ids: { notIn: verifiedIds }, isHidden: false }),
    ...(status === 'hidden' && { isHidden: true }),
    ...(areaIds && { areaIds }),
    ...(q !== undefined && { q }),
    ...(stale === true && { staleOnly: true }),
  };
}
