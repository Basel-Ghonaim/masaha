import type { AdminSpace, UpdateSpaceProfileRequest } from '@masaha/shared/spaces';

import type { RunInTransaction } from '../../../db/index.ts';
import type { AuditWriter } from '../../../shared/audit/index.ts';
import { can, isVerified, type Actor, type LoadedSpace } from '../../../shared/auth/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import type { LookupsService } from '../../lookups/index.ts';
import type { PlatformSettingsService } from '../../platform-settings/index.ts';
import { profileChange } from '../profile.ts';
import { createSpaceRepository } from '../space/space.repository.ts';
import { createSpaceView } from '../space/spaceView.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  lookups: LookupsService;
  platformSettings: PlatformSettingsService;
  /** The one clock (conventions §11): the profile's freshness date. */
  now: () => Date;
}

/**
 * A space's profile, its basics and its location: one logic for whoever `can()` lets edit it, the
 * admin while the space is unverified, its owner once it is verified (decision S9). The route says
 * nothing of who may: the space's links, which the links loader put on the request, decide.
 */
export function createProfileService({
  runInTransaction,
  audit,
  lookups,
  platformSettings,
  now,
}: Dependencies) {
  const repository = createSpaceRepository();
  const view = createSpaceView(now);

  return {
    /**
     * Edits the profile and dates it now, with its audit entry, recording only what changed. An
     * edit that changes nothing writes nothing. A new area must be one a space may be placed in.
     */
    async update(
      actor: Actor,
      space: LoadedSpace,
      edit: UpdateSpaceProfileRequest,
    ): Promise<AdminSpace> {
      // Read before the transaction opens: inside it, a read without `tx` waits on a second
      // connection while the transaction holds one.
      const thresholds = await platformSettings.stalenessThresholds();
      return runInTransaction(async (tx) => {
        const current = await repository.lock(space.id, tx);
        if (!current || current.deletedAt) throw AppError.notFound(undefined, 'Space not found');
        if (!can(actor, 'space.profile.update', space)) throw AppError.forbidden();

        const { data, before, after } = profileChange(current, edit);
        if (Object.keys(data).length === 0) return view(current, isVerified(space), thresholds);
        if (data.areaId !== undefined && !(await lookups.isActiveArea(data.areaId, tx))) {
          throw AppError.validation({ areaId: ['invalid_choice'] });
        }

        const updated = await repository.update(space.id, { ...data, profileUpdatedAt: now() }, tx);
        await audit(
          {
            actorId: actor.id,
            action: 'space.profileEdited',
            entityType: 'space',
            entityId: space.id,
            spaceId: space.id,
            before,
            after,
          },
          tx,
        );
        return view(updated, isVerified(space), thresholds);
      });
    },
  };
}

export type ProfileService = ReturnType<typeof createProfileService>;
