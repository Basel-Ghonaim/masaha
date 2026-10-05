import { isUniqueViolation, prisma, type Tx } from '../../../db/index.ts';
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.ts';
import type { Placed } from '../exactOrder.ts';

export const AREA = {
  id: true,
  governorateId: true,
  nameAr: true,
  nameEn: true,
  isActive: true,
} as const satisfies Prisma.AreaSelect;

export type AreaRow = Prisma.AreaGetPayload<{ select: typeof AREA }>;

/** What an area's write may set. Its governorate is set when it is added, and never changes. */
export type AreaData = Partial<Pick<AreaRow, 'nameAr' | 'nameEn' | 'isActive'>>;

/** A written area, or the name another area of its governorate already holds. */
export type AreaWrite = { area: AreaRow } | { taken: 'nameAr' };

export function createAreasRepository(db: PrismaClient = prisma) {
  /** A write, or its unique violation turned into the name that is taken. */
  async function written(write: Promise<AreaRow>): Promise<AreaWrite> {
    try {
      return { area: await write };
    } catch (error) {
      if (isUniqueViolation(error, 'areas_governorate_id_name_ar_key')) return { taken: 'nameAr' };
      throw error;
    }
  }

  return {
    /**
     * Locks the governorate's row until the transaction ends: adding an area and ordering the
     * governorate's areas take it, so neither misses the other's area. Whether it exists.
     */
    async lockGovernorate(governorateId: number, tx: Tx): Promise<boolean> {
      const rows = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM governorates WHERE id = ${governorateId} FOR NO KEY UPDATE`;
      return rows.length === 1;
    },

    /** The place after the last of the governorate's areas. */
    async nextPlace(governorateId: number, tx: Tx = db): Promise<number> {
      const { _max } = await tx.area.aggregate({
        where: { governorateId },
        _max: { sortOrder: true },
      });
      return (_max.sortOrder ?? -1) + 1;
    },

    create(
      data: { governorateId: number; nameAr: string; nameEn: string; sortOrder: number },
      tx: Tx = db,
    ): Promise<AreaWrite> {
      return written(tx.area.create({ data, select: AREA }));
    },

    /**
     * Locks the area's row until the transaction ends, so the state a change replaces is the one it
     * read. The area, or nothing.
     */
    async lock(id: number, tx: Tx): Promise<AreaRow | null> {
      const rows = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM areas WHERE id = ${id} FOR NO KEY UPDATE`;
      if (rows.length === 0) return null;
      return tx.area.findUnique({ where: { id }, select: AREA });
    },

    update(id: number, data: AreaData, tx: Tx = db): Promise<AreaWrite> {
      return written(tx.area.update({ where: { id }, data, select: AREA }));
    },

    /** The places of the governorate's areas, their rows locked until the transaction ends. */
    lockPlaces(governorateId: number, tx: Tx): Promise<Placed[]> {
      return tx.$queryRaw<Placed[]>`
        SELECT id, sort_order AS "sortOrder" FROM areas
        WHERE governorate_id = ${governorateId} ORDER BY id FOR NO KEY UPDATE`;
    },

    async setPlaces(places: readonly Placed[], tx: Tx): Promise<void> {
      for (const { id, sortOrder } of places) {
        await tx.area.update({ where: { id }, data: { sortOrder }, select: { id: true } });
      }
    },
  };
}

export type AreasRepository = ReturnType<typeof createAreasRepository>;
