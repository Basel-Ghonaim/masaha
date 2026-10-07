import type { OpeningRange } from '@masaha/shared/spaces';

import { prisma, type Tx } from '../../../db/index.ts';

/** A space's opening hours: one row per day of the week, closed or one range. */
export function createHoursRepository() {
  return {
    /** Sunday (0) to Saturday (6), `null` for a closed day; null when no hours were saved. */
    async listFor(spaceId: number, tx: Tx = prisma): Promise<(OpeningRange | null)[] | null> {
      const rows = await tx.spaceHours.findMany({
        where: { spaceId },
        orderBy: { dayOfWeek: 'asc' },
        select: { dayOfWeek: true, isClosed: true, opensMinute: true, closesMinute: true },
      });
      if (rows.length === 0) return null;
      const days: (OpeningRange | null)[] = Array.from({ length: 7 }, () => null);
      for (const row of rows) {
        if (!row.isClosed && row.opensMinute !== null && row.closesMinute !== null) {
          days[row.dayOfWeek] = { opensMinute: row.opensMinute, closesMinute: row.closesMinute };
        }
      }
      return days;
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
