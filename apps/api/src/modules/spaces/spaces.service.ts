import type { Tx } from '../../db/index.ts';
import {
  createSpacesRepository,
  type SpaceRow,
  type SpacesRepository,
} from './spaces.repository.ts';

interface Dependencies {
  repository?: SpacesRepository;
}

/**
 * The listed coworking spaces. So far only what the managed spaces list needs: the summaries of
 * many spaces at once.
 */
export function createSpacesService({ repository = createSpacesRepository() }: Dependencies = {}) {
  return {
    /** The summaries of these spaces, in one query; a soft-deleted space has none. */
    summariesFor(ids: readonly number[], tx?: Tx): Promise<SpaceRow[]> {
      return repository.findSummaries(ids, tx);
    },
  };
}

export type SpacesService = ReturnType<typeof createSpacesService>;
