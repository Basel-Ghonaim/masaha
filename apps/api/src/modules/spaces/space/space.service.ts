import type { AdminSpace, CreateSpaceRequest } from '@masaha/shared/spaces';

import type { RunInTransaction } from '../../../db/index.ts';
import type { AuditWriter } from '../../../shared/audit/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import type { LookupsService } from '../../lookups/index.ts';
import type {
  PlatformSettingsService,
  StalenessThresholds,
} from '../../platform-settings/index.ts';
import type { SpaceSettingsService } from '../../space-settings/index.ts';
import { profileValues, toProfileData } from '../profile.ts';
import { nextSlug, slugBase } from '../slug.ts';
import { staleCutoffs } from '../staleness.ts';
import { toAdminSpace } from './space.mapper.ts';
import { createSpaceRepository, type SpaceRecord } from './space.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  lookups: LookupsService;
  platformSettings: PlatformSettingsService;
  spaceSettings: SpaceSettingsService;
  /** The one clock (conventions §11): staleness is measured from it. */
  now: () => Date;
}

// Two creations that derive the same slug at once: the later one finds it taken when it writes,
// rolls back, and starts again with the slugs as they are then.
const CREATE_ATTEMPTS = 3;

/** Thrown inside a creation's transaction to roll it back when its slug was taken meanwhile. */
class SlugTaken extends Error {}

/** The spaces the admin keeps: created unverified, with their settings. */
export function createSpaceService({
  runInTransaction,
  audit,
  lookups,
  platformSettings,
  spaceSettings,
  now,
}: Dependencies) {
  const repository = createSpaceRepository();

  /** The space as the admin sees it, its stale groups measured now from `thresholds`. */
  function view(
    space: SpaceRecord,
    isVerified: boolean,
    thresholds: StalenessThresholds,
  ): AdminSpace {
    return toAdminSpace(space, { isVerified, cutoffs: staleCutoffs(thresholds, now()) });
  }

  return {
    /**
     * A new, unverified space, in one transaction: the space, then its settings copied from the
     * platform's new-space defaults, then its audit entry. When the defaults cannot be read, nothing
     * is written. Each write is its own statement, never a nested create (finding 11). The
     * staleness thresholds are read first, outside the transaction: an unreadable one fails before
     * anything is written, and the transaction never waits on a second connection.
     */
    async create(actorId: number, request: CreateSpaceRequest): Promise<AdminSpace> {
      const base = slugBase(request.nameEn);
      if (!base) throw AppError.validation({ nameEn: ['invalid_format'] });
      const profile = toProfileData(request);
      const thresholds = await platformSettings.stalenessThresholds();

      for (let attempt = 1; ; attempt += 1) {
        try {
          const space = await runInTransaction(async (tx) => {
            if (!(await lookups.isActiveArea(profile.areaId, tx))) {
              throw AppError.validation({ areaId: ['invalid_choice'] });
            }
            const defaults = await platformSettings.newSpaceDefaults(tx);
            const slug = nextSlug(base, await repository.takenSlugs(base, tx));
            const creation = await repository.create({ ...profile, slug }, now(), tx);
            if ('slugTaken' in creation) throw new SlugTaken();

            const { id } = creation.space;
            await spaceSettings.createFor(id, defaults, tx);
            await audit(
              {
                actorId,
                action: 'space.created',
                entityType: 'space',
                entityId: id,
                spaceId: id,
                after: { ...profileValues(profile), slug },
              },
              tx,
            );
            return creation.space;
          });
          return view(space, false, thresholds);
        } catch (error) {
          if (!(error instanceof SlugTaken)) throw error;
          if (attempt === CREATE_ATTEMPTS) {
            throw AppError.conflict(undefined, 'The slug was taken by another creation each time');
          }
        }
      }
    },
  };
}

export type SpaceService = ReturnType<typeof createSpaceService>;
