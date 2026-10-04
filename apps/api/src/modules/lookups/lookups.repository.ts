import { prisma, type Tx } from '../../db/index.ts';
import type { PrismaClient } from '../../generated/prisma/client.ts';

/** An area's names in both languages. */
export interface AreaName {
  id: number;
  nameAr: string;
  nameEn: string;
}

export function createLookupsRepository(db: PrismaClient = prisma) {
  return {
    /** The areas with these ids, active or not: a retired area still names the spaces in it. */
    findAreaNames(ids: readonly number[], tx: Tx = db): Promise<AreaName[]> {
      return tx.area.findMany({
        where: { id: { in: [...ids] } },
        select: { id: true, nameAr: true, nameEn: true },
      });
    },
  };
}

export type LookupsRepository = ReturnType<typeof createLookupsRepository>;
