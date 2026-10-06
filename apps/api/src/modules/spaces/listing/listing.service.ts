import type { PaginationQuery } from '@masaha/shared/core';
import type { FactGroup } from '@masaha/shared/spaces';

import { toSkip } from '../../../shared/http/index.ts';
import type { PlatformSettingsService } from '../../platform-settings/index.ts';
import {
  groupDatesOf,
  lastUpdate,
  staleGroups,
  staleCutoffs,
  type GroupDates,
} from '../staleness.ts';
import {
  createListingRepository,
  type ListedSpaceRecord,
  type ListingFilter,
} from './listing.repository.ts';

/** A listed space, with what `spaces` decides of it: its stale groups and its last update. */
export interface ListedSpace {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  areaId: number;
  isHidden: boolean;
  staleGroups: FactGroup[];
  lastUpdatedAt: Date;
}

/** `ListingFilter`, with "stale only" as a flag: `spaces` turns it into its own rule's cut-offs. */
export type ListingQuery = Omit<ListingFilter, 'staleBefore'> & { staleOnly?: boolean };

interface Dependencies {
  platformSettings: PlatformSettingsService;
  /** The one clock (conventions §11): staleness is measured from it. */
  now: () => Date;
}

function toListedSpace(space: ListedSpaceRecord, cutoffs: GroupDates): ListedSpace {
  const dates = groupDatesOf(space);
  return {
    id: space.id,
    slug: space.slug,
    nameEn: space.nameEn,
    nameAr: space.nameAr,
    areaId: space.areaId,
    isHidden: space.isHidden,
    staleGroups: staleGroups(dates, cutoffs),
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
  };
}

export type ListingService = ReturnType<typeof createListingService>;
