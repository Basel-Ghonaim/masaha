import type { AdminSpace, UpdateSpaceAmenitiesRequest } from '@masaha/shared/spaces';

import type { Actor, LoadedSpace } from '../../../shared/auth/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import type { LookupsService } from '../../lookups/index.ts';
import { createGroupEdit, type GroupEditDependencies } from '../facts/groupEdit.ts';
import { createSpaceAmenitiesRepository } from './amenities.repository.ts';

interface Dependencies extends GroupEditDependencies {
  /** Which amenities are active: the lookups own them. */
  lookups: LookupsService;
}

/**
 * The space's amenities, a set saved whole (decision F1). Only an active amenity can be added; a
 * retired one already linked stays until it is removed (decision F7, data-model: a retired amenity
 * keeps its links).
 */
export function createSpaceAmenitiesService({ lookups, ...dependencies }: Dependencies) {
  const editGroup = createGroupEdit(dependencies);
  const amenities = createSpaceAmenitiesRepository();

  return {
    /** Replaces the set. A save that changes nothing writes nothing, unless it was never saved. */
    update(
      actor: Actor,
      space: LoadedSpace,
      { amenityIds }: UpdateSpaceAmenitiesRequest,
    ): Promise<AdminSpace> {
      return editGroup(actor, space, 'amenities', 'Edited', async (tx, current) => {
        const before = await amenities.listFor(space.id, tx);
        const linked = new Set(before);
        const add = amenityIds.filter((id) => !linked.has(id));
        const remove = before.filter((id) => !amenityIds.includes(id));
        if (current.amenitiesUpdatedAt && add.length === 0 && remove.length === 0) return null;

        const active = new Set(await lookups.activeAmenityIds(add, tx));
        const refused = amenityIds.flatMap((id, index) =>
          linked.has(id) || active.has(id) ? [] : [index],
        );
        if (refused.length > 0) {
          throw AppError.validation(
            Object.fromEntries(
              refused.map((index) => [`amenityIds.${String(index)}`, ['invalid_choice']]),
            ),
          );
        }

        await amenities.replace(space.id, { remove, add }, tx);
        return {
          before: { amenityIds: before },
          after: { amenityIds: [...amenityIds].sort((a, b) => a - b) },
        };
      });
    },
  };
}

export type SpaceAmenitiesService = ReturnType<typeof createSpaceAmenitiesService>;
