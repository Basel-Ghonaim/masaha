import { prisma, type Tx } from '../../db/index.ts';
import type { Override } from './liveStatus.ts';

const STATE = {
  spaceId: true,
  capacity: true,
  stateOverride: true,
  stateOverrideUntil: true,
  stateOverrideById: true,
} as const;

interface StateRow {
  capacity: number | null;
  stateOverride: Override['state'] | null;
  stateOverrideUntil: Date | null;
  stateOverrideById: number | null;
}

/** A row, or none, as the live status reads it. */
function toState(row: StateRow | null): OccupancyState {
  return {
    capacity: row?.capacity ?? null,
    override:
      row?.stateOverride && row.stateOverrideUntil
        ? { state: row.stateOverride, until: row.stateOverrideUntil }
        : null,
    overrideById: row?.stateOverrideById ?? null,
  };
}

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
      return toState(await tx.spaceOccupancy.findUnique({ where: { spaceId }, select: STATE }));
    },

    /** The states of these spaces, by space, in one query; a space without a row has none. */
    async statesFor(spaceIds: readonly number[]): Promise<Map<number, OccupancyState>> {
      const rows =
        spaceIds.length === 0
          ? []
          : await prisma.spaceOccupancy.findMany({
              where: { spaceId: { in: [...spaceIds] } },
              select: STATE,
            });
      const bySpace = new Map(rows.map((row) => [row.spaceId, row]));
      return new Map(spaceIds.map((id) => [id, toState(bySpace.get(id) ?? null)]));
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

    /**
     * Sets the manual override, creating the space's row, with no capacity, on its first write. Only
     * the override's three columns are written, so a capacity is never touched.
     */
    async setOverride(
      spaceId: number,
      { state, until, byId }: Override & { byId: number },
      tx: Tx,
    ): Promise<void> {
      const override = { stateOverride: state, stateOverrideUntil: until, stateOverrideById: byId };
      await tx.spaceOccupancy.upsert({
        where: { spaceId },
        create: { spaceId, capacity: null, ...override },
        update: override,
        select: { spaceId: true },
      });
    },

    /** Clears the manual override's three columns. */
    async clearOverride(spaceId: number, tx: Tx): Promise<void> {
      await tx.spaceOccupancy.update({
        where: { spaceId },
        data: { stateOverride: null, stateOverrideUntil: null, stateOverrideById: null },
        select: { spaceId: true },
      });
    },
  };
}
