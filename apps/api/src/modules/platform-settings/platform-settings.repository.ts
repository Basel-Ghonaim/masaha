import { prisma, type Tx } from '../../db/index.ts';
import type { PrismaClient } from '../../generated/prisma/client.ts';

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
  };
}
