import { prisma, type Tx } from '../../db/index.ts';

/** A subscription check-in still open: whose, and since when. */
export interface OpenCheckIn {
  id: number;
  customerId: number;
  checkedInAt: Date;
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
  };
}
