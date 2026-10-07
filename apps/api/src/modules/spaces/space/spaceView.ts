import type { AdminSpace } from '@masaha/shared/spaces';

import type { StalenessThresholds } from '../../platform-settings/index.ts';
import type { SpaceFacts } from '../facts/facts.ts';
import { staleCutoffs } from '../staleness.ts';
import { toAdminSpace } from './space.mapper.ts';
import type { SpaceRecord } from './space.repository.ts';

/**
 * The space as the admin sees it, with its facts, its stale groups measured now from the
 * platform's thresholds; whether it is verified comes from its links, which the caller holds
 * (conventions §8). The caller reads the thresholds before any transaction it opens, so a
 * transaction never waits on a second connection.
 */
export function createSpaceView(now: () => Date) {
  return (
    space: SpaceRecord,
    isVerified: boolean,
    thresholds: StalenessThresholds,
    facts: SpaceFacts,
  ): AdminSpace =>
    toAdminSpace(space, { isVerified, cutoffs: staleCutoffs(thresholds, now()), facts });
}
