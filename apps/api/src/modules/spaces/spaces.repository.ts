import { prisma, type Tx } from '../../db/index.ts';
import type { PrismaClient } from '../../generated/prisma/client.ts';

/** What names a space in a list: its slug, its names and its area. */
export interface SpaceRow {
  id: number;
  slug: string;
  nameAr: string | null;
  nameEn: string;
  areaId: number;
}

export function createSpacesRepository(db: PrismaClient = prisma) {
  return {
    /**
     * The spaces with these ids, hidden ones included; a soft-deleted space is left out, as every
     * read of spaces does by default (ADR 0007).
     */
    findSummaries(ids: readonly number[], tx: Tx = db): Promise<SpaceRow[]> {
      return tx.space.findMany({
        where: { id: { in: [...ids] }, deletedAt: null },
        select: { id: true, slug: true, nameAr: true, nameEn: true, areaId: true },
      });
    },
  };
}

export type SpacesRepository = ReturnType<typeof createSpacesRepository>;
