import { prisma } from '../../../db/index.ts';
import { Prisma } from '../../../generated/prisma/client.ts';
import type { ClosureSpan } from '../../announcements/index.ts';

/**
 * The subscriptions a closure covered (decision 4, docs/architecture/data-model.md › Checked by the
 * service): the space's, not ended early, with an end on or after its first day, started (or with no
 * start) by its last. One fragment, so the preview counts what the extension moves.
 */
function covered(spaceId: number, { firstDay, lastDay }: ClosureSpan): Prisma.Sql {
  return Prisma.sql`"space_id" = ${spaceId} AND "ended_at" IS NULL AND "ends_on" IS NOT NULL
    AND "ends_on" >= ${firstDay}::date
    AND ("starts_on" IS NULL OR "starts_on" <= ${lastDay}::date)`;
}

/** A closure's extension as the managed list shows it: its days, how many it moved, who, when. */
export interface ExtensionRow {
  announcementId: number;
  days: number;
  subscriptions: number;
  appliedAt: Date;
  appliedById: number;
}

/** The `closure_extensions` table, and the subscriptions a closure covered. */
export function createClosuresRepository() {
  return {
    /** The extensions of these closures, each with the count of its subscriptions: one query. */
    async extensionsOf(announcementIds: readonly number[]): Promise<ExtensionRow[]> {
      if (announcementIds.length === 0) return [];
      const rows = await prisma.closureExtension.findMany({
        where: { announcementId: { in: [...announcementIds] } },
        select: {
          announcementId: true,
          days: true,
          appliedById: true,
          createdAt: true,
          _count: { select: { subscriptions: true } },
        },
      });
      return rows.map(({ announcementId, days, appliedById, createdAt, _count }) => ({
        announcementId,
        days,
        subscriptions: _count.subscriptions,
        appliedAt: createdAt,
        appliedById,
      }));
    },

    /** How many of the space's subscriptions the closure's span covered: one query. */
    async coveredCount(spaceId: number, span: ClosureSpan): Promise<number> {
      const [row] = await prisma.$queryRaw<{ count: number }[]>`
        SELECT count(*)::integer AS count FROM "subscriptions" WHERE ${covered(spaceId, span)}`;
      return row?.count ?? 0;
    },

    /** Which of these closures have had their subscriptions extended: one query. */
    async extendedAmong(announcementIds: readonly number[]): Promise<Set<number>> {
      if (announcementIds.length === 0) return new Set();
      const rows = await prisma.closureExtension.findMany({
        where: { announcementId: { in: [...announcementIds] } },
        select: { announcementId: true },
      });
      return new Set(rows.map(({ announcementId }) => announcementId));
    },
  };
}
