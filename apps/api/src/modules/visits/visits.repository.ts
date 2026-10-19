import { prisma, type Tx } from '../../db/index.ts';

/** A visit still open: who, and since when. */
export interface OpenVisit {
  id: number;
  visitorName: string | null;
  customerId: number | null;
  checkedInAt: Date;
}

/** Each space's count of rows, by space; a space with none is absent. */
function countsBySpace(groups: readonly { spaceId: number; _count: { _all: number } }[]) {
  return new Map(groups.map(({ spaceId, _count }) => [spaceId, _count._all]));
}

/** The `visits` table (docs/backend/conventions.md › the front desk). So far its open visits. */
export function createVisitsRepository() {
  return {
    /** The space's open visits, the earliest checked in first, then by id. */
    openIn(spaceId: number, tx: Tx = prisma): Promise<OpenVisit[]> {
      return tx.visit.findMany({
        where: { spaceId, checkedOutAt: null },
        select: { id: true, visitorName: true, customerId: true, checkedInAt: true },
        orderBy: [{ checkedInAt: 'asc' }, { id: 'asc' }],
      });
    },

    /** How many visits are open at each of these spaces, in one query; a space with none is absent. */
    async openCountsIn(spaceIds: readonly number[]): Promise<Map<number, number>> {
      if (spaceIds.length === 0) return new Map();
      const groups = await prisma.visit.groupBy({
        by: ['spaceId'],
        where: { spaceId: { in: [...spaceIds] }, checkedOutAt: null },
        _count: { _all: true },
      });
      return countsBySpace(groups);
    },
  };
}
