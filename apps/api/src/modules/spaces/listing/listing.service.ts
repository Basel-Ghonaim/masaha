import type { PaginationQuery } from '@masaha/shared/core';
import type { FactGroup } from '@masaha/shared/spaces';

import { AppError } from '../../../shared/errors/index.ts';
import { toSkip } from '../../../shared/http/index.ts';
import type { PlatformSettingsService } from '../../platform-settings/index.ts';
import {
  freshness,
  groupDatesOf,
  lastUpdate,
  missingGroups,
  staleGroups,
  staleCutoffs,
  type Freshness,
  type GroupCutoffs,
} from '../staleness.ts';
import {
  createListingRepository,
  type ListedSpaceRecord,
  type ListingFilter,
} from './listing.repository.ts';

/**
 * A listed space, with what `spaces` decides of it: its stale and missing groups and its last update.
 */
export interface ListedSpace {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  areaId: number;
  isHidden: boolean;
  /** When it was soft-deleted, or `null` for a live space. */
  deletedAt: Date | null;
  staleGroups: FactGroup[];
  missingGroups: FactGroup[];
  lastUpdatedAt: Date;
}

/** `ListingFilter`, with "stale only" as a flag: `spaces` turns it into its own rule's cut-offs. */
export type ListingQuery = Omit<ListingFilter, 'staleBefore'> & { staleOnly?: boolean };

interface Dependencies {
  platformSettings: PlatformSettingsService;
  /** The one clock (conventions §11): staleness is measured from it. */
  now: () => Date;
}

function toListedSpace(space: ListedSpaceRecord, cutoffs: GroupCutoffs): ListedSpace {
  const dates = groupDatesOf(space);
  return {
    id: space.id,
    slug: space.slug,
    nameEn: space.nameEn,
    nameAr: space.nameAr,
    areaId: space.areaId,
    isHidden: space.isHidden,
    deletedAt: space.deletedAt,
    staleGroups: staleGroups(dates, cutoffs),
    missingGroups: missingGroups(dates),
    lastUpdatedAt: lastUpdate(dates),
  };
}

/**
 * The spaces as a list pages them, for the module that composes the admin's list (space-links,
 * conventions §9): it resolves its own filters to ids first, and `spaces` applies the rest and
 * paginates, so every page is full and the total right (§5). The "stale only" filter and each row's
 * stale groups come from one rule, at one time.
 */
export function createListingService({ platformSettings, now }: Dependencies) {
  const repository = createListingRepository();
  return {
    async page(
      { staleOnly, ...filter }: ListingQuery,
      page: PaginationQuery,
    ): Promise<{ rows: ListedSpace[]; total: number }> {
      const cutoffs = staleCutoffs(await platformSettings.stalenessThresholds(), now());
      const { rows, total } = await repository.findPage(
        { ...filter, ...(staleOnly && { staleBefore: cutoffs }) },
        { skip: toSkip(page), take: page.limit },
      );
      return { rows: rows.map((space) => toListedSpace(space, cutoffs)), total };
    },

    /**
     * One live space's freshness at `at`, by the thresholds saved now (`staleness.ts`): its groups
     * never saved, and its stale ones with their Gaza days. A soft-deleted space is `not_found`.
     */
    async freshnessOf(spaceId: number, at: Date): Promise<Freshness> {
      const [thresholds, { rows }] = await Promise.all([
        platformSettings.stalenessThresholds(),
        repository.findPage({ ids: { in: [spaceId] } }, { skip: 0, take: 1 }),
      ]);
      const [space] = rows;
      if (!space) throw AppError.notFound(undefined, 'Space not found');
      return freshness(groupDatesOf(space), staleCutoffs(thresholds, at), at);
    },
  };
}

export type ListingService = ReturnType<typeof createListingService>;
