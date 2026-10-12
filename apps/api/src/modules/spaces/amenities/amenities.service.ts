import { isDeepStrictEqual } from 'node:util';

import type { AdminSpace, OwnAmenity, UpdateSpaceAmenitiesRequest } from '@masaha/shared/spaces';

import type { AuditValues } from '../../../shared/audit/index.ts';
import type { Actor, LoadedSpace } from '../../../shared/auth/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import type { LookupsService } from '../../lookups/index.ts';
import { createGroupEdit, type GroupEditDependencies } from '../facts/groupEdit.ts';
import { createSpaceAmenitiesRepository } from './amenities.repository.ts';
import { createOwnAmenitiesRepository } from './ownAmenities.repository.ts';

interface Dependencies extends GroupEditDependencies {
  /** Which amenities are active: the lookups own them. */
  lookups: LookupsService;
}

/** The group as an audit entry records it, whole: the platform's set by id, then its own. */
function amenitiesValues(amenityIds: readonly number[], ownAmenities: readonly OwnAmenity[]) {
  return {
    amenityIds: [...amenityIds].sort((a, b) => a - b),
    ownAmenities: ownAmenities.map(({ nameAr, nameEn }) => ({ nameAr, nameEn })),
  } satisfies AuditValues;
}

/**
 * The space's amenities, a group saved whole (decision F1): the platform's amenities as a set, and
 * the space's own, typed by it, in their order. Only an active amenity can be added; a retired one
 * already linked stays until it is removed (decision F7, data-model: a retired amenity keeps its
 * links).
 */
export function createSpaceAmenitiesService({ lookups, ...dependencies }: Dependencies) {
  const editGroup = createGroupEdit(dependencies);
  const amenities = createSpaceAmenitiesRepository();
  const ownAmenities = createOwnAmenitiesRepository();

  return {
    /**
     * Replaces the group. A save that changes nothing, the own amenities in the same order, writes
     * nothing, unless it was never saved.
     */
    update(
      actor: Actor,
      space: LoadedSpace,
      request: UpdateSpaceAmenitiesRequest,
    ): Promise<AdminSpace> {
      const { amenityIds } = request;
      const ownNext = request.ownAmenities.map(({ nameAr, nameEn }) => ({
        nameAr,
        nameEn: nameEn ?? null,
      }));
      return editGroup(actor, space, 'amenities', 'Edited', async (tx, current) => {
        const before = await amenities.listFor(space.id, tx);
        const ownBefore = await ownAmenities.listFor(space.id, tx);
        const linked = new Set(before);
        const add = amenityIds.filter((id) => !linked.has(id));
        const remove = before.filter((id) => !amenityIds.includes(id));
        const ownChanged = !isDeepStrictEqual(ownBefore, ownNext);
        const changed = add.length > 0 || remove.length > 0 || ownChanged;
        if (current.amenitiesUpdatedAt && !changed) return null;

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
        if (ownChanged) await ownAmenities.replace(space.id, ownNext, tx);
        return {
          before: amenitiesValues(before, ownBefore),
          after: amenitiesValues(amenityIds, ownNext),
        };
      });
    },
  };
}

export type SpaceAmenitiesService = ReturnType<typeof createSpaceAmenitiesService>;
