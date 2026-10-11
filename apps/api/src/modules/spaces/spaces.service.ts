import type { Tx } from '../../db/index.ts';
import { createSpacesRepository, type SpaceRow } from './spaces.repository.ts';

/**
 * The listed coworking spaces, as the modules above read them: the summaries of many spaces at
 * once, and the space's lock, which a change of its links takes.
 */
export function createSpacesService() {
  const repository = createSpacesRepository();
  return {
    /** The summaries of these spaces, in one query; a soft-deleted space has none. */
    summariesFor(ids: readonly number[], tx?: Tx): Promise<SpaceRow[]> {
      return repository.findSummaries(ids, tx);
    },

    /**
     * Takes the space's lock, which every change of the space, its facts or its links takes first
     * (conventions §13). Whether the space exists and is not soft-deleted.
     */
    lock(id: number, tx: Tx): Promise<boolean> {
      return repository.lock(id, tx);
    },
  };
}

export type SpacesService = ReturnType<typeof createSpacesService>;
