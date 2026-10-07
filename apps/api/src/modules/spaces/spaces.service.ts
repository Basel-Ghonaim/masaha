import type { Tx } from '../../db/index.ts';
import { createSpacesRepository, type SpaceRow } from './spaces.repository.ts';

/**
 * The listed coworking spaces. So far only what the managed spaces list needs: the summaries of
 * many spaces at once.
 */
export function createSpacesService() {
  const repository = createSpacesRepository();
  return {
    /** The summaries of these spaces, in one query; a soft-deleted space has none. */
    summariesFor(ids: readonly number[], tx?: Tx): Promise<SpaceRow[]> {
      return repository.findSummaries(ids, tx);
    },
  };
}

export type SpacesService = ReturnType<typeof createSpacesService>;
