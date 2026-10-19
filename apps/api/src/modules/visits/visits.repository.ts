import { prisma, type Tx } from '../../db/index.ts';

/** A visit still open: who, and since when. */
export interface OpenVisit {
  id: number;
  visitorName: string | null;
  customerId: number | null;
  checkedInAt: Date;
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
  };
}
