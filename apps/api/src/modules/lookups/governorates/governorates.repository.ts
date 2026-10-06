import { isUniqueViolation, prisma, type Tx } from '../../../db/index.ts';
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.ts';
import { AREA, type AreaRow } from '../areas/areas.repository.ts';
import type { Placed } from '../exactOrder.ts';
import { IN_ORDER } from '../listOrder.ts';

const GOVERNORATE = {
  id: true,
  nameAr: true,
  nameEn: true,
  isActive: true,
} as const satisfies Prisma.GovernorateSelect;

export type GovernorateRow = Prisma.GovernorateGetPayload<{ select: typeof GOVERNORATE }>;

/** What a governorate's write may set. */
export type GovernorateData = Partial<Pick<GovernorateRow, 'nameAr' | 'nameEn' | 'isActive'>>;

/** A written governorate, or the name another governorate already holds. */
export type GovernorateWrite = { governorate: GovernorateRow } | { taken: 'nameAr' };

export function createGovernoratesRepository(db: PrismaClient = prisma) {
  /** A write, or its unique violation turned into the name that is taken. */
  async function written(write: Promise<GovernorateRow>): Promise<GovernorateWrite> {
    try {
      return { governorate: await write };
    } catch (error) {
      if (isUniqueViolation(error, 'governorates_name_ar_key')) return { taken: 'nameAr' };
      throw error;
    }
  }

  return {
    /** Every governorate with its areas, hidden ones included, in order. */
    findAllWithAreas(tx: Tx = db): Promise<(GovernorateRow & { areas: AreaRow[] })[]> {
      return tx.governorate.findMany({
        select: { ...GOVERNORATE, areas: { select: AREA, orderBy: IN_ORDER } },
        orderBy: IN_ORDER,
      });
    },

    /** The place after the last governorate's. */
    async nextPlace(tx: Tx = db): Promise<number> {
      const { _max } = await tx.governorate.aggregate({ _max: { sortOrder: true } });
      return (_max.sortOrder ?? -1) + 1;
    },

    create(
      data: { nameAr: string; nameEn: string; sortOrder: number },
      tx: Tx = db,
    ): Promise<GovernorateWrite> {
      return written(tx.governorate.create({ data, select: GOVERNORATE }));
    },

    /**
     * Locks the governorate's row until the transaction ends, so the state a change replaces is the
     * one it read. Adding an area to it, or ordering its areas, waits for it. The governorate, or
     * nothing.
     */
    async lock(id: number, tx: Tx): Promise<GovernorateRow | null> {
      const rows = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM governorates WHERE id = ${id} FOR NO KEY UPDATE`;
      if (rows.length === 0) return null;
      return tx.governorate.findUnique({ where: { id }, select: GOVERNORATE });
    },

    update(id: number, data: GovernorateData, tx: Tx = db): Promise<GovernorateWrite> {
      return written(tx.governorate.update({ where: { id }, data, select: GOVERNORATE }));
    },

    /** Every governorate's place, its rows locked until the transaction ends. */
    lockPlaces(tx: Tx): Promise<Placed[]> {
      return tx.$queryRaw<Placed[]>`
        SELECT id, sort_order AS "sortOrder" FROM governorates ORDER BY id FOR NO KEY UPDATE`;
    },

    async setPlaces(places: readonly Placed[], tx: Tx): Promise<void> {
      for (const { id, sortOrder } of places) {
        await tx.governorate.update({ where: { id }, data: { sortOrder }, select: { id: true } });
      }
    },
  };
}

export type GovernoratesRepository = ReturnType<typeof createGovernoratesRepository>;
