import { prisma, type Tx } from '../../../db/index.ts';
import { Prisma } from '../../../generated/prisma/client.ts';
import type { ClosureSpan } from '../../announcements/index.ts';

/** A closure's extension as the managed list shows it: its days, how many it moved, who, when. */
export interface ExtensionRow {
  announcementId: number;
  days: number;
  subscriptions: number;
  appliedAt: Date;
  appliedById: number;
}

/** What an extension records: its closure, its days, who applied it, when, and the client's key. */
export interface ExtensionData {
  announcementId: number;
  days: number;
  appliedById: number;
  key: string;
  appliedAt: Date;
}

const EXTENSION = {
  announcementId: true,
  days: true,
  appliedById: true,
  createdAt: true,
  _count: { select: { subscriptions: true } },
} as const;

const toExtensionRow = ({
  announcementId,
  days,
  appliedById,
  createdAt,
  _count,
}: Prisma.ClosureExtensionGetPayload<{ select: typeof EXTENSION }>): ExtensionRow => ({
  announcementId,
  days,
  subscriptions: _count.subscriptions,
  appliedAt: createdAt,
  appliedById,
});

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

/**
 * The subscriptions an extension moves (finding 151): those the closure covered, and the chain of
 * renewals of each that has not started by `today` (a Gaza date) and was not ended early — the
 * renewal of a renewal too. A renewal started, or with no start, runs on its own days: the covered
 * rule judges it. It names `covered` and `chain` for the statement that follows.
 */
function moved(spaceId: number, span: ClosureSpan, today: string): Prisma.Sql {
  const pending = Prisma.sql`s."space_id" = ${spaceId} AND s."ended_at" IS NULL
    AND s."starts_on" IS NOT NULL AND s."starts_on" > ${today}::date`;
  return Prisma.sql`WITH RECURSIVE covered AS (
      SELECT "id" FROM "subscriptions" WHERE ${covered(spaceId, span)}
    ), chain AS (
      SELECT s."id" FROM "subscriptions" s JOIN covered c ON s."renewal_of_id" = c."id"
      WHERE ${pending}
      UNION
      SELECT s."id" FROM "subscriptions" s JOIN chain c ON s."renewal_of_id" = c."id"
      WHERE ${pending}
    )`;
}

/** The `closure_extensions` table, and the subscriptions a closure covered. */
export function createClosuresRepository() {
  return {
    /** The extensions of these closures, each with the count of its subscriptions: one query. */
    async extensionsOf(announcementIds: readonly number[]): Promise<ExtensionRow[]> {
      if (announcementIds.length === 0) return [];
      const rows = await prisma.closureExtension.findMany({
        where: { announcementId: { in: [...announcementIds] } },
        select: EXTENSION,
      });
      return rows.map(toExtensionRow);
    },

    /** How many subscriptions an extension at `today` would move, the renewals included: one query. */
    async movedCount(spaceId: number, span: ClosureSpan, today: string): Promise<number> {
      const [row] = await prisma.$queryRaw<{ count: number }[]>`
        ${moved(spaceId, span, today)}
        SELECT ((SELECT count(*) FROM covered)
          + (SELECT count(*) FROM chain WHERE "id" NOT IN (SELECT "id" FROM covered)))::integer AS count`;
      return row?.count ?? 0;
    },

    /**
     * Locks the subscriptions an extension at `today` moves (`FOR UPDATE`, by id: the renewals with
     * the covered ones, in one statement) and answers them, the covered apart from the renewals.
     */
    async lockMoved(
      spaceId: number,
      span: ClosureSpan,
      today: string,
      tx: Tx,
    ): Promise<{ covered: number[]; renewals: number[] }> {
      const rows = await tx.$queryRaw<{ id: number; renewal: boolean }[]>`
        ${moved(spaceId, span, today)}
        SELECT "id", ("id" IN (SELECT "id" FROM chain) AND "id" NOT IN (SELECT "id" FROM covered)) AS "renewal"
        FROM "subscriptions"
        WHERE "id" IN (SELECT "id" FROM covered UNION SELECT "id" FROM chain)
        ORDER BY "id" FOR UPDATE`;
      return {
        covered: rows.filter(({ renewal }) => !renewal).map(({ id }) => id),
        renewals: rows.filter(({ renewal }) => renewal).map(({ id }) => id),
      };
    },

    /** Moves these subscriptions' ends by `days`: one statement. */
    async moveEnds(ids: readonly number[], days: number, at: Date, tx: Tx): Promise<void> {
      if (ids.length === 0) return;
      await tx.$executeRaw`
        UPDATE "subscriptions" SET "ends_on" = "ends_on" + ${days}::integer, "updated_at" = ${at}
        WHERE "id" = ANY(${[...ids]}::integer[])`;
    },

    /** Moves these renewals' starts and ends by `days` (an end of `NULL` stays): one statement. */
    async moveRenewals(ids: readonly number[], days: number, at: Date, tx: Tx): Promise<void> {
      if (ids.length === 0) return;
      await tx.$executeRaw`
        UPDATE "subscriptions" SET "starts_on" = "starts_on" + ${days}::integer,
          "ends_on" = "ends_on" + ${days}::integer, "updated_at" = ${at}
        WHERE "id" = ANY(${[...ids]}::integer[])`;
    },

    /** The extension this key applied, with the count of its subscriptions; `null` for none. */
    async findByKey(key: string, tx: Tx): Promise<ExtensionRow | null> {
      const row = await tx.closureExtension.findUnique({
        where: { idempotencyKey: key },
        select: EXTENSION,
      });
      return row && toExtensionRow(row);
    },

    /** Whether the closure's subscriptions were extended already. */
    async isExtended(announcementId: number, tx: Tx): Promise<boolean> {
      const row = await tx.closureExtension.findUnique({
        where: { announcementId },
        select: { id: true },
      });
      return row !== null;
    },

    /** Records the extension and links it to each subscription it moved: two statements. */
    async createExtension(
      { announcementId, days, appliedById, key, appliedAt }: ExtensionData,
      subscriptionIds: readonly number[],
      tx: Tx,
    ): Promise<void> {
      const { id } = await tx.closureExtension.create({
        data: { announcementId, days, appliedById, idempotencyKey: key, createdAt: appliedAt },
        select: { id: true },
      });
      if (subscriptionIds.length === 0) return;
      await tx.subscriptionExtension.createMany({
        data: subscriptionIds.map((subscriptionId) => ({ closureExtensionId: id, subscriptionId })),
      });
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
