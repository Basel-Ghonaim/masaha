import type { AmenityIconKey } from '@masaha/shared/lookups';

import { prisma, type Tx } from '../../db/index.ts';
import type { PrismaClient } from '../../generated/prisma/client.ts';
import { IN_ORDER } from './listOrder.ts';

/** An area's names in both languages. */
export interface AreaName {
  id: number;
  nameAr: string;
  nameEn: string;
}

/** How well a search matches an area's names, from 0 to 1 (the database's `masaha_search_score`). */
export interface AreaMatch {
  id: number;
  score: number;
}

/** An active amenity, named, with its icon. */
export interface NamedAmenity {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: AmenityIconKey;
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

    /** The ids of the areas that may take a space: active, in an active governorate. */
    async findListedAreaIds(tx: Tx = db): Promise<number[]> {
      const rows = await tx.area.findMany({
        where: { isActive: true, governorate: { isActive: true } },
        select: { id: true },
      });
      return rows.map(({ id }) => id);
    },

    /**
     * How well the search matches each listed area's names, the better of its two languages, by
     * the database's one rule; the areas it does not match at all are left out.
     */
    findAreaMatches(q: string, tx: Tx = db): Promise<AreaMatch[]> {
      return tx.$queryRaw<AreaMatch[]>`
        SELECT id, score FROM (
          SELECT a.id, GREATEST(masaha_search_score(${q}, a.name_ar),
                                masaha_search_score(${q}, a.name_en))::float8 AS score
          FROM areas a JOIN governorates g ON g.id = a.governorate_id
          WHERE a.is_active AND g.is_active
        ) matches
        WHERE score > 0`;
    },

    /** Of these amenities, the active ones, named, in the platform's order. */
    async findActiveAmenitiesNamed(ids: readonly number[], tx: Tx = db): Promise<NamedAmenity[]> {
      const rows = await tx.amenity.findMany({
        where: { id: { in: [...ids] }, isActive: true },
        select: { id: true, nameAr: true, nameEn: true, icon: true },
        orderBy: IN_ORDER,
      });
      // Written only from AMENITY_ICON_KEYS: by the seed, typed by it, and by the validated requests.
      return rows.map((row) => ({ ...row, icon: row.icon as AmenityIconKey }));
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
