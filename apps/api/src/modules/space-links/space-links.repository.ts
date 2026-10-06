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
