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

/** A space with its soft delete, as a change reads it under its lock. */
export type LockedSpace = SpaceRecord & { deletedAt: Date | null };

/** A fact group's date column, set when the group is saved or confirmed. */
export type GroupDateColumn =
  | 'profileUpdatedAt'
  | 'hoursUpdatedAt'
  | 'pricesUpdatedAt'
  | 'amenitiesUpdatedAt'
  | 'contactsUpdatedAt';

/** What a change of a space may set. */
export type SpaceData = Partial<ProfileData> &
  Partial<Record<GroupDateColumn, Date>> & {
    isHidden?: boolean;
    deletedAt?: Date | null;
  };

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
     * A new space, alone: its settings are written by their own module, after it (finding 11). Its
     * profile is dated `now`; its other groups have no date, missing until each is first saved.
     */
    async create(
      data: ProfileData & { slug: string },
      now: Date,
      tx: Tx = db,
    ): Promise<SpaceCreation> {
      try {
        return {
          space: await tx.space.create({
            data: { ...data, profileUpdatedAt: now },
            select: SPACE,
          }),
        };
      } catch (error) {
        if (isUniqueViolation(error, 'spaces_slug_key')) return { slugTaken: true };
        throw error;
      }
    },

    /** The space, unless it is soft-deleted (ADR 0007). */
    findLive(id: number, tx: Tx = db): Promise<SpaceRecord | null> {
      return tx.space.findFirst({ where: { id, deletedAt: null }, select: SPACE });
    },

    /**
     * Locks the space's row until the transaction ends, so the state a change replaces is the one
     * it read. The space, a soft-deleted one included, or nothing.
     */
    async lock(id: number, tx: Tx): Promise<LockedSpace | null> {
      const rows = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM spaces WHERE id = ${id} FOR NO KEY UPDATE`;
      if (rows.length === 0) return null;
      return tx.space.findUnique({ where: { id }, select: { ...SPACE, deletedAt: true } });
    },

    update(id: number, data: SpaceData, tx: Tx): Promise<SpaceRecord> {
      return tx.space.update({ where: { id }, data, select: SPACE });
    },
  };
}

export type SpaceRepository = ReturnType<typeof createSpaceRepository>;
