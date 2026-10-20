import type { Tx } from '../../db/index.ts';
import { createVisitsRepository, type OpenVisit } from './visits.repository.ts';

/**
 * A visitor's stay at a space, checked in by name (docs/backend/conventions.md › the front desk).
 * So far the reads `occupancy` composes *present* from.
 */
export function createVisitsService() {
  const repository = createVisitsRepository();
  return {
    /** The space's open visits, the earliest checked in first, then by id. */
    openIn(spaceId: number, tx?: Tx): Promise<OpenVisit[]> {
      return repository.openIn(spaceId, tx);
    },

    /** How many visits are open at each of these spaces, in one query; a space with none is absent. */
    openCountsIn(spaceIds: readonly number[]): Promise<Map<number, number>> {
      return repository.openCountsIn(spaceIds);
    },
  };
}

export type VisitsService = ReturnType<typeof createVisitsService>;
