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

    /** The ids of the governorate's areas, hidden ones included. */
    async findAreaIdsOf(governorateId: number, tx: Tx = db): Promise<number[]> {
      const rows = await tx.area.findMany({ where: { governorateId }, select: { id: true } });
      return rows.map(({ id }) => id);
    },

    /** Whether the area exists and is active, and so is its governorate. */
    async isActiveArea(id: number, tx: Tx = db): Promise<boolean> {
      const count = await tx.area.count({
        where: { id, isActive: true, governorate: { isActive: true } },
      });
      return count === 1;
    },

    /** Of these amenity ids, those of active amenities. */
    async findActiveAmenityIds(ids: readonly number[], tx: Tx = db): Promise<number[]> {
      const rows = await tx.amenity.findMany({
        where: { id: { in: [...ids] }, isActive: true },
        select: { id: true },
      });
      return rows.map(({ id }) => id);
    },
  };
}

export type LookupsRepository = ReturnType<typeof createLookupsRepository>;
