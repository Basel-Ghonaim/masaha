import { isUniqueViolation, prisma, type Tx } from '../../../db/index.ts';
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.ts';
import type { Placed } from '../exactOrder.ts';
import { IN_ORDER } from '../listOrder.ts';

const AMENITY = {
  id: true,
  key: true,
  nameAr: true,
  nameEn: true,
  icon: true,
  isActive: true,
  isFilterable: true,
} as const satisfies Prisma.AmenitySelect;

export type AmenityRow = Prisma.AmenityGetPayload<{ select: typeof AMENITY }>;

/** What an amenity's edit may set. Its key never changes. */
export type AmenityData = Partial<Omit<AmenityRow, 'id' | 'key'>>;

export interface NewAmenity {
  key: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  isFilterable: boolean;
  sortOrder: number;
}

export function createAmenitiesRepository(db: PrismaClient = prisma) {
  return {
    /** Every amenity, retired ones included, in order. */
    findAll(tx: Tx = db): Promise<AmenityRow[]> {
      return tx.amenity.findMany({ select: AMENITY, orderBy: IN_ORDER });
    },

    /** The place after the last amenity's. */
    async nextPlace(tx: Tx = db): Promise<number> {
      const { _max } = await tx.amenity.aggregate({ _max: { sortOrder: true } });
      return (_max.sortOrder ?? -1) + 1;
    },

    /** A new amenity, or `taken` when another amenity, retired ones included, has its key. */
    async create(
      data: NewAmenity,
      tx: Tx = db,
    ): Promise<{ amenity: AmenityRow } | { taken: 'key' }> {
      try {
        return { amenity: await tx.amenity.create({ data, select: AMENITY }) };
      } catch (error) {
        if (isUniqueViolation(error, 'amenities_key_key')) return { taken: 'key' };
        throw error;
      }
    },

    /**
     * Locks the amenity's row until the transaction ends, so the state a change replaces is the one
     * it read. The amenity, or nothing.
     */
    async lock(id: number, tx: Tx): Promise<AmenityRow | null> {
      const rows = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM amenities WHERE id = ${id} FOR NO KEY UPDATE`;
      if (rows.length === 0) return null;
      return tx.amenity.findUnique({ where: { id }, select: AMENITY });
    },

    update(id: number, data: AmenityData, tx: Tx = db): Promise<AmenityRow> {
      return tx.amenity.update({ where: { id }, data, select: AMENITY });
    },

    /** Every amenity's place, its rows locked until the transaction ends. */
    lockPlaces(tx: Tx): Promise<Placed[]> {
      return tx.$queryRaw<Placed[]>`
        SELECT id, sort_order AS "sortOrder" FROM amenities ORDER BY id FOR NO KEY UPDATE`;
    },

    async setPlaces(places: readonly Placed[], tx: Tx): Promise<void> {
      for (const { id, sortOrder } of places) {
        await tx.amenity.update({ where: { id }, data: { sortOrder }, select: { id: true } });
      }
    },
  };
}

export type AmenitiesRepository = ReturnType<typeof createAmenitiesRepository>;
