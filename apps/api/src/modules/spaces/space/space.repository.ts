import { isUniqueViolation, prisma, type Tx } from '../../../db/index.ts';
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.ts';

export const SPACE = {
  id: true,
  slug: true,
  nameEn: true,
  nameAr: true,
  descriptionAr: true,
  descriptionEn: true,
  areaId: true,
  addressAr: true,
  addressEn: true,
  landmarkAr: true,
  landmarkEn: true,
  lat: true,
  lng: true,
  isHidden: true,
  profileUpdatedAt: true,
  hoursUpdatedAt: true,
  pricesUpdatedAt: true,
  amenitiesUpdatedAt: true,
  contactsUpdatedAt: true,
} as const satisfies Prisma.SpaceSelect;

export type SpaceRecord = Prisma.SpaceGetPayload<{ select: typeof SPACE }>;

/** A space's profile, as it is written: its basics and its location. */
export interface ProfileData {
  nameEn: string;
  nameAr: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  areaId: number;
  addressAr: string;
  addressEn: string | null;
  landmarkAr: string | null;
  landmarkEn: string | null;
  lat: number;
  lng: number;
}

/** A created space, or its slug taken meanwhile by another creation. */
export type SpaceCreation = { space: SpaceRecord } | { slugTaken: true };

export function createSpaceRepository(db: PrismaClient = prisma) {
  return {
    /**
     * Every slug that is the base or the base with a suffix, a soft-deleted space's included: a slug
     * is never reused (data-model.md).
     */
    async takenSlugs(base: string, tx: Tx = db): Promise<string[]> {
      const rows = await tx.space.findMany({
        where: { OR: [{ slug: base }, { slug: { startsWith: `${base}-` } }] },
        select: { slug: true },
      });
      return rows.map(({ slug }) => slug);
    },

    /**
     * A new space, alone: its settings are written by their own module, after it (finding 11).
     * Every fact group is dated `now`.
     */
    async create(
      data: ProfileData & { slug: string },
      now: Date,
      tx: Tx = db,
    ): Promise<SpaceCreation> {
      const dates = {
        profileUpdatedAt: now,
        hoursUpdatedAt: now,
        pricesUpdatedAt: now,
        amenitiesUpdatedAt: now,
        contactsUpdatedAt: now,
      };
      try {
        return { space: await tx.space.create({ data: { ...data, ...dates }, select: SPACE }) };
      } catch (error) {
        if (isUniqueViolation(error, 'spaces_slug_key')) return { slugTaken: true };
        throw error;
      }
    },
  };
}

export type SpaceRepository = ReturnType<typeof createSpaceRepository>;
