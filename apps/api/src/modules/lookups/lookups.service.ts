import type { Tx } from '../../db/index.ts';
import {
  createLookupsRepository,
  type AreaMatch,
  type AreaName,
  type LookupsRepository,
  type NamedAmenity,
} from './lookups.repository.ts';

interface Dependencies {
  repository?: LookupsRepository;
}

/**
 * The bilingual lookup lists, as other modules read them: area names, for many areas at once; a
 * governorate's areas; whether an area may take a space, and which areas may; how well a search
 * matches the areas' names; and the amenities: which may be added to a space, and their names.
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

    /**
     * The areas a space may be placed in, and so listed publicly in (data-model › Publicly listed):
     * active, in an active governorate.
     */
    listedAreaIds(tx?: Tx): Promise<number[]> {
      return repository.findListedAreaIds(tx);
    },

    /** How well the search matches each listed area's names; the areas it misses are left out. */
    areaMatches(q: string, tx?: Tx): Promise<AreaMatch[]> {
      return repository.findAreaMatches(q, tx);
    },

    /** Of these amenities, the active ones, named, with their icons, in the platform's order. */
    activeAmenitiesNamed(ids: readonly number[], tx?: Tx): Promise<NamedAmenity[]> {
      return repository.findActiveAmenitiesNamed(ids, tx);
    },

    /** Of these amenity ids, those a space may gain: the active amenities' (a retired one may not). */
    activeAmenityIds(ids: readonly number[], tx?: Tx): Promise<number[]> {
      return repository.findActiveAmenityIds(ids, tx);
    },
  };
}

export type LookupsService = ReturnType<typeof createLookupsService>;
