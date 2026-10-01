import { prisma, type Tx } from '../../db/index.ts';
import type { PrismaClient } from '../../generated/prisma/client.ts';

const REFRESH_TOKEN = {
  id: true,
  userId: true,
  familyId: true,
  expiresAt: true,
  rotatedAt: true,
} as const;

export interface StoredRefreshToken {
  id: number;
  userId: number;
  familyId: number;
  expiresAt: Date;
  rotatedAt: Date | null;
}

export interface NewRefreshToken {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  /** The family to join. Without one, the token starts its own: its family is its own id. */
  familyId?: number;
}

export function createSessionsRepository(db: PrismaClient = prisma) {
  return {
    async createRefreshToken(token: NewRefreshToken, tx: Tx = db): Promise<StoredRefreshToken> {
      let { familyId } = token;
      if (familyId === undefined) {
        // The id is taken first, so the first token of a family names it in the same insert.
        const [row] = await tx.$queryRaw<{ id: bigint }[]>`
          SELECT nextval(pg_get_serial_sequence('refresh_tokens', 'id')) AS id`;
        familyId = Number(row?.id);
        return tx.refreshToken.create({
          data: { ...token, id: familyId, familyId },
          select: REFRESH_TOKEN,
        });
      }
      return tx.refreshToken.create({ data: { ...token, familyId }, select: REFRESH_TOKEN });
    },

    findRefreshToken(tokenHash: string, tx: Tx = db): Promise<StoredRefreshToken | null> {
      return tx.refreshToken.findUnique({ where: { tokenHash }, select: REFRESH_TOKEN });
    },

    /** Marks the token rotated, unless a concurrent refresh already did. Whether this call did. */
    async markRotated(id: number, replacedById: number, at: Date, tx: Tx = db): Promise<boolean> {
      const { count } = await tx.refreshToken.updateMany({
        where: { id, rotatedAt: null },
        data: { rotatedAt: at, replacedById },
      });
      return count === 1;
    },

    async deleteFamily(familyId: number, tx: Tx = db): Promise<void> {
      await tx.refreshToken.deleteMany({ where: { familyId } });
    },

    async deleteUserTokens(userId: number, tx: Tx = db): Promise<void> {
      await tx.refreshToken.deleteMany({ where: { userId } });
    },

    async deleteExpired(userId: number, now: Date, tx: Tx = db): Promise<void> {
      await tx.refreshToken.deleteMany({ where: { userId, expiresAt: { lte: now } } });
    },
  };
}

export type SessionsRepository = ReturnType<typeof createSessionsRepository>;
