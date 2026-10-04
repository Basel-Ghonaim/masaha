import type { Tx } from '../../db/index.ts';
import {
  createLookupsRepository,
  type AreaName,
  type LookupsRepository,
} from './lookups.repository.ts';

interface Dependencies {
  repository?: LookupsRepository;
}

/**
 * The bilingual lookup lists: governorates, areas and amenities. So far only what the managed
 * spaces list needs: area names, for many areas at once.
 */
export function createLookupsService({
  repository = createLookupsRepository(),
}: Dependencies = {}) {
  return {
    /** The names of these areas, in one query. */
    areaNamesFor(ids: readonly number[], tx?: Tx): Promise<AreaName[]> {
      return repository.findAreaNames(ids, tx);
    },
  };
}

export type LookupsService = ReturnType<typeof createLookupsService>;
