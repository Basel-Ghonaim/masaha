import { prisma, type Tx } from '../../db/index.ts';

/** A subscription check-in still open: whose, and since when. */
export interface OpenCheckIn {
  id: number;
  customerId: number;
  checkedInAt: Date;
}

/** An open check-in as the auto check-out reads it: its space and its check-in. */
export interface OpenAttendance {
  id: number;
  spaceId: number;
  checkedInAt: Date;
}

/** Each space's count of rows, by space; a space with none is absent. */
function countsBySpace(groups: readonly { spaceId: number; _count: { _all: number } }[]) {
  return new Map(groups.map(({ spaceId, _count }) => [spaceId, _count._all]));
}

/**
 * The `check_ins` table (docs/backend/conventions.md › the front desk). So far its open rows and
 * their auto check-out.
 */
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

    /** Every open check-in, of every space, the earliest first, then by id. */
    openEverywhere(): Promise<OpenAttendance[]> {
      return prisma.checkIn.findMany({
        where: { checkedOutAt: null },
        select: { id: true, spaceId: true, checkedInAt: true },
        orderBy: [{ checkedInAt: 'asc' }, { id: 'asc' }],
      });
    },

    /** Locks the check-in's row (`FOR UPDATE`) while it is still open: whether it was. */
    async lockOpen(checkInId: number, tx: Tx): Promise<boolean> {
      const locked = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM check_ins WHERE id = ${checkInId} AND checked_out_at IS NULL FOR UPDATE`;
      return locked.length > 0;
    },

    /** Closes the check-in by the auto check-out, at its due time. */
    async closeAuto(checkInId: number, checkedOutAt: Date, tx: Tx): Promise<void> {
      await tx.checkIn.update({
        where: { id: checkInId },
        data: { checkedOutAt, checkoutMethod: 'AUTO' },
        select: { id: true },
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
