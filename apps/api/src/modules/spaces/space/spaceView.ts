import type { AdminSpace } from '@masaha/shared/spaces';

import type { Tx } from '../../../db/index.ts';
import type { LookupsService } from '../../lookups/index.ts';
import type { StalenessThresholds } from '../../platform-settings/index.ts';
import type { SpaceFacts } from '../facts/facts.ts';
import { staleCutoffs } from '../staleness.ts';
import { toAdminSpace } from './space.mapper.ts';
import type { SpaceRecord } from './space.repository.ts';

/**
 * The space as the admin sees it, with its facts, its stale groups measured now from the
 * platform's thresholds; whether it is verified comes from its links, which the caller holds
 * (conventions §8). The caller reads the thresholds before any transaction it opens, so a
 * transaction never waits on a second connection. The retired amenities it holds are named by
 * the lookups, in the caller's transaction (finding 99).
 */
export function createSpaceView(now: () => Date, lookups: LookupsService) {
  return async (
    space: SpaceRecord,
    isVerified: boolean,
    thresholds: StalenessThresholds,
    facts: SpaceFacts,
    owners: AdminSpace['owners'],
    tx?: Tx,
  ): Promise<AdminSpace> => {
    const retired = await lookups.retiredAmenitiesNamed(facts.amenityIds, tx);
    return toAdminSpace(space, {
      isVerified,
      owners,
      cutoffs: staleCutoffs(thresholds, now()),
      facts,
      retiredAmenities: retired.map(({ id, nameAr, nameEn, icon }) => ({
        id,
        nameAr,
        nameEn,
        iconKey: icon,
      })),
    });
  };
}
