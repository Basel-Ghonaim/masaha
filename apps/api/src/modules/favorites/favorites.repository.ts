import { FAVORITES_MAX } from '@masaha/shared/favorites';

import { prisma, type Tx } from '../../db/index.ts';

/** A saved space: which, and when it was saved. */
export interface SavedSpace {
  spaceId: number;
  savedAt: Date;
}

export function createFavoritesRepository() {
  return {
    /** Whether the user has saved the space. */
    async has(userId: number, spaceId: number, tx: Tx): Promise<boolean> {
      const found = await tx.favorite.findUnique({
        where: { userId_spaceId: { userId, spaceId } },
        select: { userId: true },
      });
      return found !== null;
    },

    /** How many spaces the user has saved. */
    countOf(userId: number, tx: Tx): Promise<number> {
      return tx.favorite.count({ where: { userId } });
    },

    async create(data: { userId: number; spaceId: number; createdAt: Date }, tx: Tx) {
      await tx.favorite.create({ data, select: { userId: true } });
    },

    /** Removes the user's favourite of the space, if there is one. */
    async remove(userId: number, spaceId: number): Promise<void> {
      await prisma.favorite.deleteMany({ where: { userId, spaceId } });
    },

    /** The user's saved spaces, the newest saved first (then by space id). */
    async of(userId: number): Promise<SavedSpace[]> {
      const rows = await prisma.favorite.findMany({
        where: { userId },
        select: { spaceId: true, createdAt: true },
        orderBy: [{ createdAt: 'desc' }, { spaceId: 'desc' }],
        take: FAVORITES_MAX,
      });
      return rows.map(({ spaceId, createdAt }) => ({ spaceId, savedAt: createdAt }));
    },
  };
}
