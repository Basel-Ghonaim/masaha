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
 * The bilingual lookup lists, as other modules read them: area names, for many areas at once; a
 * governorate's areas; and whether an area may take a space.
 */
export function createLookupsService({
  repository = createLookupsRepository(),
}: Dependencies = {}) {
  return {
    /** The names of these areas, in one query. */
    areaNamesFor(ids: readonly number[], tx?: Tx): Promise<AreaName[]> {
      return repository.findAreaNames(ids, tx);
    },

    /** The ids of the governorate's areas, hidden ones included: a filter by governorate. */
    areaIdsOf(governorateId: number, tx?: Tx): Promise<number[]> {
      return repository.findAreaIdsOf(governorateId, tx);
    },

    /**
     * Whether a space may be placed in the area: it exists, and both it and its governorate are
     * active, as the public catalogue offers it.
     */
    isActiveArea(id: number, tx?: Tx): Promise<boolean> {
      return repository.isActiveArea(id, tx);
    },
  };
}

export type LookupsService = ReturnType<typeof createLookupsService>;
