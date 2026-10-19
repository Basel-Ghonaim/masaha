import { prisma, type Tx } from '../../db/index.ts';

/** A space's occupancy row (docs/backend/conventions.md › occupancy). So far its capacity only. */
export function createOccupancyRepository() {
  return {
    /** The space's capacity; `null` when none is set, a space without a row included. */
    async capacityOf(spaceId: number, tx: Tx = prisma): Promise<number | null> {
      const row = await tx.spaceOccupancy.findUnique({
        where: { spaceId },
        select: { capacity: true },
      });
      return row?.capacity ?? null;
    },

    /**
     * Sets the capacity, creating the space's row on its first write. Only the capacity is written,
     * so the manual override's columns are never touched.
     */
    async setCapacity(spaceId: number, capacity: number | null, tx: Tx): Promise<void> {
      await tx.spaceOccupancy.upsert({
        where: { spaceId },
        create: { spaceId, capacity },
        update: { capacity },
        select: { spaceId: true },
      });
    },
  };
}
