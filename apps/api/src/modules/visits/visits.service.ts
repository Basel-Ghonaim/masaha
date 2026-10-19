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
  };
}

export type VisitsService = ReturnType<typeof createVisitsService>;
