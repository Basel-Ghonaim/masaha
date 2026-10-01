import { prisma, type Tx } from '../../db/index.ts';
import type { PrismaClient } from '../../generated/prisma/client.ts';
import type { SpaceManagerRole } from '../../generated/prisma/enums.ts';

export interface ActiveLink {
  spaceId: number;
  role: SpaceManagerRole;
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
  };
}

export type SpaceLinksRepository = ReturnType<typeof createSpaceLinksRepository>;
