import type { AnnouncementState, AnnouncementType } from '@masaha/shared/announcements';

import { prisma, type Tx } from '../../db/index.ts';
import type { Prisma } from '../../generated/prisma/client.ts';

const ANNOUNCEMENT = {
  id: true,
  type: true,
  textAr: true,
  textEn: true,
  startsAt: true,
  endsAt: true,
  deletedAt: true,
} as const;

/** Each state as a filter on the instants at `now` (`announcementState`'s comparisons). */
const STATE_WHERE = {
  RUNNING: (now: Date) => ({
    startsAt: { lte: now },
    OR: [{ endsAt: null }, { endsAt: { gt: now } }],
  }),
  UPCOMING: (now: Date) => ({ startsAt: { gt: now } }),
  ENDED: (now: Date) => ({ endsAt: { lte: now } }),
} satisfies Record<AnnouncementState, (now: Date) => Prisma.AnnouncementWhereInput>;

/** An announcement as its space's staff see it; `deletedAt` set once deleted. */
export interface AnnouncementRow {
  id: number;
  type: AnnouncementType;
  textAr: string;
  textEn: string | null;
  startsAt: Date;
  endsAt: Date | null;
  deletedAt: Date | null;
}

/** The fields a post sets, and an edit may change. */
export interface AnnouncementData {
  type?: AnnouncementType;
  textAr?: string;
  textEn?: string | null;
  startsAt?: Date;
  endsAt?: Date | null;
}

/**
 * The `announcements` table: a space's announcements. The closures the live status reads; one by
 * key or by id, locked; their posts and changes.
 */
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

    /** The space's announcement posted with this idempotency key, deleted or not, or `null`. */
    findByKey(spaceId: number, key: string, tx: Tx): Promise<AnnouncementRow | null> {
      return tx.announcement.findUnique({
        where: { spaceId_idempotencyKey: { spaceId, idempotencyKey: key } },
        select: ANNOUNCEMENT,
      });
    },

    /**
     * Locks the space's announcement's row (`FOR UPDATE`) and answers it; `null` when it is not the
     * space's, or deleted unless `withDeleted`.
     */
    async lockIn(
      spaceId: number,
      id: number,
      tx: Tx,
      { withDeleted = false }: { withDeleted?: boolean } = {},
    ): Promise<AnnouncementRow | null> {
      const locked = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM announcements WHERE id = ${id} AND space_id = ${spaceId} FOR UPDATE`;
      if (locked.length === 0) return null;
      const row = await tx.announcement.findUniqueOrThrow({ where: { id }, select: ANNOUNCEMENT });
      return withDeleted || row.deletedAt === null ? row : null;
    },

    create(
      spaceId: number,
      data: Required<AnnouncementData> & { key: string },
      tx: Tx,
    ): Promise<AnnouncementRow> {
      const { key, ...fields } = data;
      return tx.announcement.create({
        data: { spaceId, ...fields, idempotencyKey: key },
        select: ANNOUNCEMENT,
      });
    },

    /**
     * A page of the space's announcements in one state at `now`, not deleted: running and upcoming
     * by start, then id; ended by end, latest first, then id; and how many there are in it.
     */
    async page(
      spaceId: number,
      { state, now }: { state: AnnouncementState; now: Date },
      { skip, take }: { skip: number; take: number },
    ): Promise<{ rows: AnnouncementRow[]; total: number }> {
      const where = { spaceId, deletedAt: null, ...STATE_WHERE[state](now) };
      const orderBy =
        state === 'ENDED'
          ? [{ endsAt: 'desc' as const }, { id: 'desc' as const }]
          : [{ startsAt: 'asc' as const }, { id: 'asc' as const }];
      const [rows, total] = await Promise.all([
        prisma.announcement.findMany({ where, orderBy, skip, take, select: ANNOUNCEMENT }),
        prisma.announcement.count({ where }),
      ]);
      return { rows, total };
    },

    /** How many of the space's announcements, not deleted, are in each state at `now`: one query. */
    async counts(spaceId: number, now: Date): Promise<Record<AnnouncementState, number>> {
      const [counts] = await prisma.$queryRaw<
        { running: number; upcoming: number; ended: number }[]
      >`
        SELECT
          count(*) FILTER (WHERE starts_at <= ${now} AND (ends_at IS NULL OR ends_at > ${now}))::int
            AS running,
          count(*) FILTER (WHERE starts_at > ${now})::int AS upcoming,
          count(*) FILTER (WHERE ends_at <= ${now})::int AS ended
        FROM announcements WHERE space_id = ${spaceId} AND deleted_at IS NULL`;
      return {
        RUNNING: counts?.running ?? 0,
        UPCOMING: counts?.upcoming ?? 0,
        ENDED: counts?.ended ?? 0,
      };
    },

    /** The ids of the space's closures, not deleted, started at or before `now` and since `since`. */
    async startedClosureIds(spaceId: number, now: Date, since: Date): Promise<number[]> {
      const rows = await prisma.announcement.findMany({
        where: { spaceId, type: 'CLOSURE', deletedAt: null, startsAt: { lte: now, gte: since } },
        select: { id: true },
      });
      return rows.map(({ id }) => id);
    },

    /**
     * The space's announcements the public sees at `now`: not deleted, not ended (running or
     * upcoming), by start, then id, at most `take`.
     */
    publicOf(spaceId: number, now: Date, take: number): Promise<AnnouncementRow[]> {
      return prisma.announcement.findMany({
        where: { spaceId, deletedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        take,
        select: ANNOUNCEMENT,
      });
    },

    update(
      id: number,
      data: AnnouncementData & { deletedAt?: Date },
      tx: Tx,
    ): Promise<AnnouncementRow> {
      return tx.announcement.update({ where: { id }, data, select: ANNOUNCEMENT });
    },
  };
}
