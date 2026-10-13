import type { PaginationQuery } from '@masaha/shared/core';
import type { Location, OpeningRange } from '@masaha/shared/spaces';

import { toSkip } from '../../../shared/http/index.ts';
import type { Storage } from '../../../shared/storage/index.ts';
import type { PlatformSettingsService } from '../../platform-settings/index.ts';
import { createHoursRepository } from '../hours/hours.repository.ts';
import { objectKeyOf } from '../photos/photoSizes.ts';
import { createPhotosRepository } from '../photos/photos.repository.ts';
import { staleCutoffs } from '../staleness.ts';
import {
  createPublicListingRepository,
  type PublicFilter,
  type PublicOrder,
  type PublicSpaceRecord,
} from './publicListing.repository.ts';

/** A publicly listed space, as the directory's list and map show it. */
export interface ListedPublicSpace {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  areaId: number;
  location: Location;
  isVerified: boolean;
  /** Sunday (0) to Saturday (6), `null` on a closed day; `null` while never saved. */
  days: (OpeningRange | null)[] | null;
  /** In metres, straight-line, to the nearest 100: only when ordered by distance. */
  distanceMeters: number | null;
  /** Its first photo's card-size URL, or `null` without a photo. */
  cover: string | null;
}

/** `PublicFilter` without the price cut-off, which `spaces` measures with its own staleness rule. */
export type PublicListingFilter = Omit<PublicFilter, 'pricesStaleBefore'>;

export type { PublicOrder };

interface Dependencies {
  platformSettings: PlatformSettingsService;
  /** The one clock (conventions §11): staleness is measured from it. */
  now: () => Date;
  /** Where the photos' files are fetched from: the covers' URLs. */
  storage: Storage;
}

/**
 * The publicly listed spaces, as the directory composes them (conventions §9, Composed reads): it
 * resolves the verified spaces and the listed areas to ids first; `spaces` applies its own filters,
 * the search and the order, and pages, so every page is full and the total right (§5). Each space
 * comes with its week.
 */
export function createPublicListingService({ platformSettings, now, storage }: Dependencies) {
  const repository = createPublicListingRepository();
  const hours = createHoursRepository();
  const photos = createPhotosRepository();

  async function withPriceCutoff(filter: PublicListingFilter): Promise<PublicFilter> {
    const cutoffs = staleCutoffs(await platformSettings.stalenessThresholds(), now());
    return { ...filter, pricesStaleBefore: cutoffs.prices };
  }

  /** Each space with its week and its cover, one query each for the whole set. */
  async function withWeeksAndCovers(records: PublicSpaceRecord[]): Promise<ListedPublicSpace[]> {
    const ids = records.map(({ id }) => id);
    const [weeks, covers] =
      records.length === 0
        ? [new Map<number, (OpeningRange | null)[]>(), new Map<number, string>()]
        : await Promise.all([hours.weeksFor(ids), photos.coverKeysFor(ids)]);
    return records.map((record) => ({
      id: record.id,
      slug: record.slug,
      nameEn: record.nameEn,
      nameAr: record.nameAr,
      areaId: record.areaId,
      location: { lat: record.lat, lng: record.lng },
      isVerified: record.isVerified,
      days: weeks.get(record.id) ?? null,
      distanceMeters: record.distance === null ? null : Math.round(record.distance / 100) * 100,
      cover: coverUrl(covers.get(record.id)),
    }));
  }

  /** The card-size URL of the cover stored under `key`, if there is one. */
  function coverUrl(key: string | undefined): string | null {
    return key === undefined ? null : storage.url(objectKeyOf(key, 'card'));
  }

  return {
    /** One page of the listed spaces that pass the filter, in the order, and how many pass it. */
    async page(
      filter: PublicListingFilter,
      order: PublicOrder,
      page: PaginationQuery,
    ): Promise<{ rows: ListedPublicSpace[]; total: number }> {
      const { rows, total } = await repository.findPage(await withPriceCutoff(filter), order, {
        skip: toSkip(page),
        take: page.limit,
      });
      return { rows: await withWeeksAndCovers(rows), total };
    },

    /**
     * Every listed space that passes the filter, by id, up to `ceiling`; `truncated` when more
     * pass.
     */
    async upTo(
      filter: PublicListingFilter,
      ceiling: number,
    ): Promise<{ rows: ListedPublicSpace[]; truncated: boolean }> {
      const records = await repository.findFirst(await withPriceCutoff(filter), ceiling + 1);
      return {
        rows: await withWeeksAndCovers(records.slice(0, ceiling)),
        truncated: records.length > ceiling,
      };
    },
  };
}

export type PublicListingService = ReturnType<typeof createPublicListingService>;
