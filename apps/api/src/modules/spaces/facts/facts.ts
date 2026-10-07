import type { Price, SpaceHours } from '@masaha/shared/spaces';

import type { Tx } from '../../../db/index.ts';
import { createHoursRepository } from '../hours/hours.repository.ts';
import { createShiftsRepository } from '../hours/shifts.repository.ts';
import { createPricesRepository } from '../prices/prices.repository.ts';

/** A space's facts, as the admin's edit screen shows them beside the profile. */
export interface SpaceFacts {
  hours: SpaceHours | null;
  prices: Price[];
}

/** A new space's facts: none of its groups has been saved. */
export const NO_FACTS: SpaceFacts = { hours: null, prices: [] };

/** Reads every fact group of a space, with `tx` inside a transaction. */
export function createFactsReader() {
  const hours = createHoursRepository();
  const shifts = createShiftsRepository();
  const prices = createPricesRepository();

  // One query at a time: a transaction's connection runs one statement at once (finding 11).
  return async function readFacts(spaceId: number, tx?: Tx): Promise<SpaceFacts> {
    const days = await hours.listFor(spaceId, tx);
    const shiftList = await shifts.listFor(spaceId, tx);
    return {
      hours: days ? { days, shifts: shiftList } : null,
      prices: await prices.listFor(spaceId, tx),
    };
  };
}
