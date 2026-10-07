import type { AdminSpace, UpdateSpaceProfileRequest } from '@masaha/shared/spaces';

import type { Actor, LoadedSpace } from '../../../shared/auth/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import type { LookupsService } from '../../lookups/index.ts';
import { createGroupEdit, type GroupEditDependencies } from '../facts/groupEdit.ts';
import { profileChange } from '../profile.ts';
import { createSpaceRepository } from '../space/space.repository.ts';

interface Dependencies extends GroupEditDependencies {
  /** Whether an area may take a space: the lookups own the areas. */
  lookups: LookupsService;
}

/**
 * A space's profile, its basics and its location: one logic for whoever `can()` lets edit it, the
 * admin while the space is unverified, its owner once it is verified (decision S9). The route says
 * nothing of who may: the space's links, which the links loader put on the request, decide. It
 * changes through the save path every fact group takes.
 */
export function createProfileService({ lookups, ...dependencies }: Dependencies) {
  const editGroup = createGroupEdit(dependencies);
  const repository = createSpaceRepository();

  return {
    /**
     * Edits the profile and dates it now, with its audit entry, recording only what changed. An
     * edit that changes nothing writes nothing. A new area must be one a space may be placed in.
     */
    update(actor: Actor, space: LoadedSpace, edit: UpdateSpaceProfileRequest): Promise<AdminSpace> {
      return editGroup(actor, space, 'profile', 'Edited', async (tx, current) => {
        const { data, before, after } = profileChange(current, edit);
        if (Object.keys(data).length === 0) return null;
        if (data.areaId !== undefined && !(await lookups.isActiveArea(data.areaId, tx))) {
          throw AppError.validation({ areaId: ['invalid_choice'] });
        }
        await repository.update(space.id, data, tx);
        return { before, after };
      });
    },
  };
}

export type ProfileService = ReturnType<typeof createProfileService>;
