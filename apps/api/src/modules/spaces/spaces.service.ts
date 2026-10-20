import type { OpeningRange, Price } from '@masaha/shared/spaces';

import type { Tx } from '../../db/index.ts';
import { createHoursRepository } from './hours/hours.repository.ts';
import { createPricesRepository } from './prices/prices.repository.ts';
import { createSpacesRepository, type SpaceRow } from './spaces.repository.ts';

/**
 * The listed coworking spaces, as the modules above read them: the summaries of many spaces at
 * once, a space's week and prices, and the space's lock, which a change of its links takes.
 */
export function createSpacesService() {
  const repository = createSpacesRepository();
  const hours = createHoursRepository();
  const prices = createPricesRepository();
  return {
    /** The summaries of these spaces, in one query; a soft-deleted space has none. */
    summariesFor(ids: readonly number[], tx?: Tx): Promise<SpaceRow[]> {
      return repository.findSummaries(ids, tx);
    },

    /** The space's week, Sunday (0) to Saturday (6), `null` for a closed day; null without hours. */
    weekOf(spaceId: number, tx?: Tx): Promise<(OpeningRange | null)[] | null> {
      return hours.listFor(spaceId, tx);
    },

    /** The weeks of these spaces, by space, in one query; a space without hours is absent. */
    weeksFor(spaceIds: readonly number[], tx?: Tx): Promise<Map<number, (OpeningRange | null)[]>> {
      return hours.weeksFor(spaceIds, tx);
    },

    /** The space's published prices, in the order they are shown in. */
    pricesOf(spaceId: number, tx?: Tx): Promise<Price[]> {
      return prices.listFor(spaceId, tx);
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
