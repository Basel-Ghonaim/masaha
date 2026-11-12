import type { OpeningRange } from '@masaha/shared/spaces';

import { prisma, type Tx } from '../../../db/index.ts';

const DAY = { dayOfWeek: true, isClosed: true, opensMinute: true, closesMinute: true } as const;

interface DayRow {
  dayOfWeek: number;
  isClosed: boolean;
  opensMinute: number | null;
  closesMinute: number | null;
}

/** The week from a space's day rows: Sunday (0) to Saturday (6), `null` for a closed day. */
function toWeek(rows: readonly DayRow[]): (OpeningRange | null)[] {
  const days: (OpeningRange | null)[] = Array.from({ length: 7 }, () => null);
  for (const row of rows) {
    if (!row.isClosed && row.opensMinute !== null && row.closesMinute !== null) {
      days[row.dayOfWeek] = { opensMinute: row.opensMinute, closesMinute: row.closesMinute };
    }
  }
  return days;
}

/** A space's opening hours: one row per day of the week, closed or one range. */
export function createHoursRepository() {
  return {
    /** Sunday (0) to Saturday (6), `null` for a closed day; null when no hours were saved. */
    async listFor(spaceId: number, tx: Tx = prisma): Promise<(OpeningRange | null)[] | null> {
      const rows = await tx.spaceHours.findMany({ where: { spaceId }, select: DAY });
      return rows.length === 0 ? null : toWeek(rows);
    },

    /**
     * The weeks of these spaces, by space, in one query; a space whose hours were never saved has
     * none.
     */
    async weeksFor(
      spaceIds: readonly number[],
      tx: Tx = prisma,
    ): Promise<Map<number, (OpeningRange | null)[]>> {
      const rows = await tx.spaceHours.findMany({
        where: { spaceId: { in: [...spaceIds] } },
        select: { spaceId: true, ...DAY },
      });
      const bySpace = new Map<number, DayRow[]>();
      for (const row of rows) bySpace.set(row.spaceId, [...(bySpace.get(row.spaceId) ?? []), row]);
      return new Map([...bySpace].map(([spaceId, days]) => [spaceId, toWeek(days)]));
    },

    /** Whether the owner declares the space works in the evening (E4). */
    async worksEveningsOf(spaceId: number, tx: Tx = prisma): Promise<boolean> {
      const space = await tx.space.findUniqueOrThrow({
        where: { id: spaceId },
        select: { worksEvenings: true },
      });
      return space.worksEvenings;
    },

    /** Sets the evening switch, part of the hours group. */
    async setWorksEvenings(spaceId: number, worksEvenings: boolean, tx: Tx): Promise<void> {
      await tx.space.update({
        where: { id: spaceId },
        data: { worksEvenings },
        select: { id: true },
      });
    },

    /** Replaces the week, one statement at a time (finding 11). */
    async replace(spaceId: number, days: readonly (OpeningRange | null)[], tx: Tx): Promise<void> {
      await tx.spaceHours.deleteMany({ where: { spaceId } });
      for (const [dayOfWeek, day] of days.entries()) {
        await tx.spaceHours.create({
          data: day
            ? { spaceId, dayOfWeek, opensMinute: day.opensMinute, closesMinute: day.closesMinute }
            : { spaceId, dayOfWeek, isClosed: true },
          select: { id: true },
        });
      }
    },
  };
}
