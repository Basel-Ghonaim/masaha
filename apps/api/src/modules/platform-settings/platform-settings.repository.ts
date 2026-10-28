import { prisma, type Tx } from '../../db/index.ts';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.ts';

/** A stored setting, its value not yet validated. */
export interface StoredSetting {
  key: string;
  value: unknown;
}

export function createPlatformSettingsRepository(db: PrismaClient = prisma) {
  return {
    /** The stored settings with these keys; a key with no row is absent. */
    findMany(keys: readonly string[], tx: Tx = db): Promise<StoredSetting[]> {
      return tx.setting.findMany({
        where: { key: { in: [...keys] } },
        select: { key: true, value: true },
      });
    },

    /**
     * A row for each of these keys that has none, its value JSON `null`; a row already there is kept.
     * Two first saves at once both pass: the second waits on the first's insert, then does nothing.
     */
    async ensure(keys: readonly string[], tx: Tx): Promise<void> {
      if (keys.length === 0) return;
      const rows = keys.map((key) => Prisma.sql`(${key}, 'null'::jsonb, now())`);
      await tx.$executeRaw`
        INSERT INTO "settings" ("key", "value", "updated_at") VALUES ${Prisma.join(rows)}
        ON CONFLICT ("key") DO NOTHING`;
    },

    /** Locks these keys' rows, in one fixed order (by key), and answers them as they are. */
    lock(keys: readonly string[], tx: Tx): Promise<StoredSetting[]> {
      return tx.$queryRaw<StoredSetting[]>`
        SELECT "key", "value" FROM "settings" WHERE "key" = ANY(${[...keys]}::text[])
        ORDER BY "key" FOR UPDATE`;
    },

    /** Stores a key's value; `null` as JSON `null`. */
    async write(key: string, value: unknown, tx: Tx): Promise<void> {
      await tx.setting.update({
        where: { key },
        data: { value: value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue) },
        select: { key: true },
      });
    },
  };
}
