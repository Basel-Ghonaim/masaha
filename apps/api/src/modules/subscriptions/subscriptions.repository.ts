import { prisma, type Tx } from '../../db/index.ts';

/** A subscription check-in still open: whose, and since when. */
export interface OpenCheckIn {
  id: number;
  customerId: number;
  checkedInAt: Date;
}

/** Each space's count of rows, by space; a space with none is absent. */
function countsBySpace(groups: readonly { spaceId: number; _count: { _all: number } }[]) {
  return new Map(groups.map(({ spaceId, _count }) => [spaceId, _count._all]));
}

/** The `check_ins` table (docs/backend/conventions.md › the front desk). So far its open rows. */
export function createSubscriptionsRepository() {
  return {
    /** The space's open check-ins, the earliest first, then by id. */
    openCheckInsIn(spaceId: number, tx: Tx = prisma): Promise<OpenCheckIn[]> {
      return tx.checkIn.findMany({
        where: { spaceId, checkedOutAt: null },
        select: { id: true, customerId: true, checkedInAt: true },
        orderBy: [{ checkedInAt: 'asc' }, { id: 'asc' }],
      });
    },

    /** How many check-ins are open at each of these spaces, in one query; none is absent. */
    async openCheckInCountsIn(spaceIds: readonly number[]): Promise<Map<number, number>> {
      if (spaceIds.length === 0) return new Map();
      const groups = await prisma.checkIn.groupBy({
        by: ['spaceId'],
        where: { spaceId: { in: [...spaceIds] }, checkedOutAt: null },
        _count: { _all: true },
      });
      return countsBySpace(groups);
    },
  };
}
