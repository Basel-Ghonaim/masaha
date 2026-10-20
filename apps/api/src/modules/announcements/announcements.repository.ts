import { prisma, type Tx } from '../../db/index.ts';

/** The `announcements` table: a space's announcements. So far its closures. */
export function createAnnouncementsRepository() {
  return {
    /**
     * Which of these spaces an active closure covers at `now`: a `CLOSURE` not deleted, started, and
     * not yet ended (docs/architecture/data-model.md › Live status).
     */
    async closedAt(spaceIds: readonly number[], now: Date, tx?: Tx): Promise<Set<number>> {
      if (spaceIds.length === 0) return new Set();
      const rows = await (tx ?? prisma).announcement.findMany({
        where: {
          spaceId: { in: [...spaceIds] },
          type: 'CLOSURE',
          deletedAt: null,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
        select: { spaceId: true },
        distinct: ['spaceId'],
      });
      return new Set(rows.map(({ spaceId }) => spaceId));
    },
  };
}
