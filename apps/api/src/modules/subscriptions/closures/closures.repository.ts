import { prisma } from '../../../db/index.ts';

/** A closure's extension as the managed list shows it: its days, how many it moved, who, when. */
export interface ExtensionRow {
  announcementId: number;
  days: number;
  subscriptions: number;
  appliedAt: Date;
  appliedById: number;
}

/** The `closure_extensions` table, as the managed announcements list reads it. */
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
