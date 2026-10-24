import type { AnnouncementType } from '@masaha/shared/announcements';

import { prisma, type Tx } from '../../db/index.ts';

const ANNOUNCEMENT = {
  id: true,
  type: true,
  textAr: true,
  textEn: true,
  startsAt: true,
  endsAt: true,
  deletedAt: true,
} as const;

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

    update(
      id: number,
      data: AnnouncementData & { deletedAt?: Date },
      tx: Tx,
    ): Promise<AnnouncementRow> {
      return tx.announcement.update({ where: { id }, data, select: ANNOUNCEMENT });
    },
  };
}
