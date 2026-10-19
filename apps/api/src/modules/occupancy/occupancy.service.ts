import type { SetCapacityRequest, SpaceCapacity } from '@masaha/shared/occupancy';

import type { RunInTransaction } from '../../db/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import { can, type Actor, type LoadedSpace } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { SpacesService } from '../spaces/index.ts';
import { createOccupancyRepository } from './occupancy.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  spaces: SpacesService;
}

/**
 * A space's state now (docs/backend/conventions.md › occupancy); so far its capacity, private to its
 * staff and set by its owner (docs/api/api-contract.md §5, Capacity (managed)). The read is one
 * query with no lock: one statement is never half of a change.
 */
export function createOccupancyService({ runInTransaction, audit, spaces }: Dependencies) {
  const occupancy = createOccupancyRepository();

  return {
    /** The space's capacity; `null` before one is set. */
    async capacity(spaceId: number): Promise<SpaceCapacity> {
      return { capacity: await occupancy.capacityOf(spaceId) };
    },

    /**
     * Sets the space's capacity, in one transaction and in this order: the space's lock; `can()` on
     * the links read under it, so a link ended meanwhile still decides (finding 43); the capacity,
     * the row created on its first write; its audit entry. The capacity it already has writes and
     * audits nothing.
     */
    setCapacity(
      actor: Actor,
      space: LoadedSpace,
      { capacity }: SetCapacityRequest,
    ): Promise<SpaceCapacity> {
      return runInTransaction(async (tx) => {
        if (!(await spaces.lock(space.id, tx))) {
          throw AppError.notFound(undefined, 'Space not found');
        }
        if (!can(actor, 'space.capacity.manage', { links: await space.linksUnder(tx) })) {
          throw AppError.forbidden();
        }
        const current = await occupancy.capacityOf(space.id, tx);
        if (current === capacity) return { capacity };

        await occupancy.setCapacity(space.id, capacity, tx);
        await audit(
          {
            actorId: actor.id,
            action: 'space.capacityEdited',
            entityType: 'space',
            entityId: space.id,
            spaceId: space.id,
            before: { capacity: current },
            after: { capacity },
          },
          tx,
        );
        return { capacity };
      });
    },
  };
}

export type OccupancyService = ReturnType<typeof createOccupancyService>;
