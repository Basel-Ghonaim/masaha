import { prisma, type Tx } from '../../db/index.ts';
import type { Override } from './liveStatus.ts';

/** A space's occupancy row as the live status reads it. */
export interface OccupancyState {
  capacity: number | null;
  /** The stored override, in force or not; `null` when none is stored. */
  override: Override | null;
  overrideById: number | null;
}

/** A space's occupancy row (docs/backend/conventions.md › occupancy): its capacity and override. */
export function createOccupancyRepository() {
  return {
    /** The space's capacity and override; none of them for a space without a row. */
    async stateOf(spaceId: number, tx: Tx = prisma): Promise<OccupancyState> {
      const row = await tx.spaceOccupancy.findUnique({
        where: { spaceId },
        select: {
          capacity: true,
          stateOverride: true,
          stateOverrideUntil: true,
          stateOverrideById: true,
        },
      });
      return {
        capacity: row?.capacity ?? null,
        override:
          row?.stateOverride && row.stateOverrideUntil
            ? { state: row.stateOverride, until: row.stateOverrideUntil }
            : null,
        overrideById: row?.stateOverrideById ?? null,
      };
    },

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
