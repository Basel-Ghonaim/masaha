import type {
  Contact,
  FactGroup,
  Location,
  OwnAmenity,
  Price,
  SpaceHours,
} from '@masaha/shared/spaces';

import type { RunInTransaction, Tx } from '../../../db/index.ts';
import type { PlatformSettingsService } from '../../platform-settings/index.ts';
import { createFactsReader } from '../facts/facts.ts';
import { createSpaceRepository } from '../space/space.repository.ts';
import { groupDatesOf, pricesHidden, staleCutoffs, staleGroups } from '../staleness.ts';

/** A space as its public page shows it, before the directory names its area and amenities. */
export interface PublicSpaceView {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  areaId: number;
  addressAr: string;
  addressEn: string | null;
  landmarkAr: string | null;
  landmarkEn: string | null;
  location: Location;
  /** Decided under the space's lock, with the facts shown. */
  isVerified: boolean;
  hours: SpaceHours | null;
  /** `null` when hidden: an unverified space's stale prices. */
  prices: Price[] | null;
  /** The platform's amenities it has, retired ones included: the directory keeps the active. */
  amenityIds: number[];
  ownAmenities: OwnAmenity[];
  contacts: Contact[];
  updatedAt: Record<FactGroup, string | null>;
  staleGroups: FactGroup[];
}

interface Dependencies {
  runInTransaction: RunInTransaction;
  platformSettings: PlatformSettingsService;
  /** The one clock (conventions §11): staleness is measured from it. */
  now: () => Date;
}

/**
 * A space's public page, from `spaces`' side: found by its slug while it is shown, and read whole
 * under its share lock, as the admin's read is, so a save in progress is never read half done
 * (finding 43). Whether its area is listed and whether it is verified come from the modules that
 * own them, through the directory.
 */
export function createPublicSpaceService({
  runInTransaction,
  platformSettings,
  now,
}: Dependencies) {
  const repository = createSpaceRepository();
  const readFacts = createFactsReader();

  return {
    /** The space with this slug, unless it is soft-deleted or hidden. */
    findShown(slug: string): Promise<{ id: number; areaId: number } | null> {
      return repository.findShownBySlug(slug);
    },

    /**
     * The space with its facts, its prices hidden as the public is kept from them; `null` once it
     * is soft-deleted or hidden. Whether it is verified is asked of `verifiedUnder` under the same
     * lock: every link change takes it, so the answer and the prices it hides agree.
     */
    async read(
      id: number,
      verifiedUnder: (tx: Tx) => Promise<boolean>,
    ): Promise<PublicSpaceView | null> {
      // Read before the transaction opens: inside it, a read without `tx` waits on a second
      // connection while the transaction holds one.
      const thresholds = await platformSettings.stalenessThresholds();
      return runInTransaction(async (tx) => {
        const space = await repository.lockShared(id, tx);
        if (!space || space.isHidden) return null;
        const isVerified = await verifiedUnder(tx);
        const facts = await readFacts(id, tx);
        const dates = groupDatesOf(space);
        const cutoffs = staleCutoffs(thresholds, now());
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
          isVerified,
          hours: facts.hours,
          prices: pricesHidden(isVerified, dates, cutoffs) ? null : facts.prices,
          amenityIds: facts.amenityIds,
          ownAmenities: facts.ownAmenities,
          contacts: facts.contacts,
          updatedAt: {
            profile: dates.profile?.toISOString() ?? null,
            hours: dates.hours?.toISOString() ?? null,
            prices: dates.prices?.toISOString() ?? null,
            amenities: dates.amenities?.toISOString() ?? null,
            contacts: dates.contacts?.toISOString() ?? null,
          },
          staleGroups: staleGroups(dates, cutoffs),
        };
      });
    },
  };
}

export type PublicSpaceService = ReturnType<typeof createPublicSpaceService>;
