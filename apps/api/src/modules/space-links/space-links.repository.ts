import { prisma, type Tx } from '../../db/index.ts';
import type { PrismaClient } from '../../generated/prisma/client.ts';
import type { SpaceManagerRole } from '../../generated/prisma/enums.ts';
import type { SpaceLink } from '../../shared/auth/index.ts';

export interface ActiveLink {
  spaceId: number;
  role: SpaceManagerRole;
}

/** An active OWNER link: the owner and the space it verifies. */
export interface OwnerLink {
  spaceId: number;
  userId: number;
}

export function createSpaceLinksRepository(db: PrismaClient = prisma) {
  return {
    /** The user's active links, oldest first. */
    findActiveLinks(userId: number, tx: Tx = db): Promise<ActiveLink[]> {
      return tx.spaceManager.findMany({
        where: { userId, deactivatedAt: null },
        select: { spaceId: true, role: true },
        orderBy: [{ createdAt: 'asc' }, { spaceId: 'asc' }],
      });
    },

    /** Every link to the space, deactivated ones included: what `can()` reads of it. */
    findLinksAt(spaceId: number, tx: Tx = db): Promise<SpaceLink[]> {
      return tx.spaceManager.findMany({
        where: { spaceId },
        select: { userId: true, role: true, deactivatedAt: true },
      });
    },

    /** Every verified space's id: those with an active OWNER link, in one query (ADR 0009). */
    async findVerifiedSpaceIds(tx: Tx = db): Promise<number[]> {
      const rows = await tx.spaceManager.findMany({
        where: { role: 'OWNER', deactivatedAt: null },
        select: { spaceId: true },
        distinct: ['spaceId'],
      });
      return rows.map(({ spaceId }) => spaceId);
    },

    /** The user's link to the space, active or not, if there is one. */
    findLink(
      spaceId: number,
      userId: number,
      tx: Tx,
    ): Promise<{ role: SpaceManagerRole; deactivatedAt: Date | null } | null> {
      return tx.spaceManager.findUnique({
        where: { spaceId_userId: { spaceId, userId } },
        select: { role: true, deactivatedAt: true },
      });
    },

    /**
     * Links the user to the space as its owner: a new row, or the one the pair already has,
     * reactivated as an owner's (the pair is the table's key).
     */
    async linkOwner(spaceId: number, userId: number, tx: Tx): Promise<void> {
      await tx.spaceManager.upsert({
        where: { spaceId_userId: { spaceId, userId } },
        create: { spaceId, userId, role: 'OWNER' },
        update: { role: 'OWNER', deactivatedAt: null },
        select: { spaceId: true },
      });
    },

    /** Deactivates the user's active OWNER link to the space, if any. Whether there was one. */
    async deactivateOwnerLink(spaceId: number, userId: number, at: Date, tx: Tx): Promise<boolean> {
      const { count } = await tx.spaceManager.updateMany({
        where: { spaceId, userId, role: 'OWNER', deactivatedAt: null },
        data: { deactivatedAt: at },
      });
      return count === 1;
    },

    /** How many active links the user holds, of either role, a soft-deleted space's included. */
    countActiveLinks(userId: number, tx: Tx): Promise<number> {
      return tx.spaceManager.count({ where: { userId, deactivatedAt: null } });
    },

    /** How many active OWNER links the user holds, a soft-deleted space's included. */
    countOwnerLinks(userId: number, tx: Tx): Promise<number> {
      return tx.spaceManager.count({ where: { userId, role: 'OWNER', deactivatedAt: null } });
    },

    /** The active OWNER links of these users, oldest first. */
    findOwnerLinksOf(userIds: readonly number[], tx: Tx = db): Promise<OwnerLink[]> {
      return tx.spaceManager.findMany({
        where: { userId: { in: [...userIds] }, role: 'OWNER', deactivatedAt: null },
        select: { spaceId: true, userId: true },
        orderBy: [{ createdAt: 'asc' }, { spaceId: 'asc' }],
      });
    },

    /** The active OWNER links of these spaces, oldest first. */
    findOwnerLinks(spaceIds: readonly number[], tx: Tx = db): Promise<OwnerLink[]> {
      return tx.spaceManager.findMany({
        where: { spaceId: { in: [...spaceIds] }, role: 'OWNER', deactivatedAt: null },
        select: { spaceId: true, userId: true },
        orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
      });
    },
  };
}

export type SpaceLinksRepository = ReturnType<typeof createSpaceLinksRepository>;
