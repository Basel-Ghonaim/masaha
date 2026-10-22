import type { Tx } from '../../db/index.ts';
import type { OpenCheckIn, SubscriptionsService } from '../subscriptions/index.ts';
import type { OpenVisit, VisitsService } from '../visits/index.ts';

/** Who is present at a space: its open visits and its open subscription check-ins, and how many. */
export interface Present {
  visits: OpenVisit[];
  checkIns: OpenCheckIn[];
  count: number;
}

/**
 * *Present*, defined once (docs/features/occupancy.md): a space's open visits plus its open
 * subscription check-ins, never a closed stay or another space's. The staff's read, the check-in's
 * warnings and refusal, and the directory's live status all count it here, from these two sources.
 */
export function createPresent({
  visits,
  subscriptions,
}: {
  visits: VisitsService;
  subscriptions: SubscriptionsService;
}) {
  /** Who is present at the space, in the caller's transaction when given. */
  async function presentIn(spaceId: number, tx?: Tx): Promise<Present> {
    const openVisits = await visits.openIn(spaceId, tx);
    const openCheckIns = await subscriptions.openCheckInsIn(spaceId, tx);
    return {
      visits: openVisits,
      checkIns: openCheckIns,
      count: openVisits.length + openCheckIns.length,
    };
  }

  return {
    presentIn,

    /** How many are present at each of these spaces, one query per source; none is absent. */
    async presentCountsIn(spaceIds: readonly number[]): Promise<Map<number, number>> {
      const [visitCounts, checkInCounts] = await Promise.all([
        visits.openCountsIn(spaceIds),
        subscriptions.openCheckInCountsIn(spaceIds),
      ]);
      const counts = new Map(visitCounts);
      for (const [spaceId, count] of checkInCounts) {
        counts.set(spaceId, (counts.get(spaceId) ?? 0) + count);
      }
      return counts;
    },

    /** Whether the space's customer is present, by an open check-in or an open visit. */
    async isPresent(spaceId: number, customerId: number, tx?: Tx): Promise<boolean> {
      const { visits: openVisits, checkIns } = await presentIn(spaceId, tx);
      return [...openVisits, ...checkIns].some((stay) => stay.customerId === customerId);
    },
  };
}
