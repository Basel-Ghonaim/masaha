import { prisma, type Tx } from '../../db/index.ts';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.ts';

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

const RECOVERY = {
  id: true,
  userId: true,
  maskedEmail: true,
  emailDigest: true,
  resetTokenId: true,
  resends: true,
  sentAt: true,
  expiresAt: true,
} as const;

export interface StoredRecovery {
  id: number;
  userId: number | null;
  maskedEmail: string;
  emailDigest: string | null;
  resetTokenId: number | null;
  resends: number;
  sentAt: Date;
  expiresAt: Date;
}

export interface NewRecovery {
  keyHash: string;
  userId?: number;
  maskedEmail: string;
  emailDigest?: string;
  sentAt: Date;
  expiresAt: Date;
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

    /** A new reset token. Earlier ones stay until this one is delivered. Its id. */
    async createResetToken(
      userId: number,
      tokenHash: string,
      expiresAt: Date,
      tx: Tx = db,
    ): Promise<number> {
      const { id } = await tx.passwordResetToken.create({
        data: { userId, tokenHash, expiresAt },
        select: { id: true },
      });
      return id;
    },

    /**
     * Ends the user's unused reset tokens older than `id`: one statement, so concurrent requests
     * converge on the newest delivered link.
     */
    async deleteOlderUnusedResetTokens(userId: number, id: number, tx: Tx = db): Promise<void> {
      await tx.passwordResetToken.deleteMany({ where: { userId, usedAt: null, id: { lt: id } } });
    },

    async deleteUserResetTokens(userId: number, tx: Tx = db): Promise<void> {
      await tx.passwordResetToken.deleteMany({ where: { userId } });
    },

    async deleteResetToken(id: number, tx: Tx = db): Promise<void> {
      await tx.passwordResetToken.deleteMany({ where: { id } });
    },

    /** Whose unused, unexpired reset token this is. Changes nothing. */
    async findResetTokenOwner(
      tokenHash: string,
      now: Date,
      tx: Tx = db,
    ): Promise<number | undefined> {
      const row = await tx.passwordResetToken.findFirst({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
        select: { userId: true },
      });
      return row?.userId;
    },

    /** The unused, unexpired reset token with this hash. Changes nothing. */
    findValidResetToken(
      tokenHash: string,
      now: Date,
      tx: Tx = db,
    ): Promise<{ id: number; userId: number; expiresAt: Date } | null> {
      return tx.passwordResetToken.findFirst({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
        select: { id: true, userId: true, expiresAt: true },
      });
    },

    /**
     * Uses the reset link bound to the recovery this key opens, in one atomic statement, so it is
     * used once. Whose it was, if the recovery and its link were both still valid.
     */
    async consumeRecoveryLink(
      keyHash: string,
      now: Date,
      tx: Tx = db,
    ): Promise<number | undefined> {
      const [row] = await tx.$queryRaw<{ user_id: number }[]>`
        UPDATE password_reset_tokens AS link SET used_at = ${now}, updated_at = ${now}
        FROM password_recoveries AS recovery
        WHERE recovery.key_hash = ${keyHash} AND recovery.expires_at > ${now}
          AND link.id = recovery.reset_token_id
          AND link.used_at IS NULL AND link.expires_at > ${now}
        RETURNING link.user_id`;
      return row?.user_id;
    },

    createRecovery(recovery: NewRecovery, tx: Tx = db): Promise<StoredRecovery> {
      return tx.passwordRecovery.create({ data: recovery, select: RECOVERY });
    },

    /** The recovery this key opens, while it lasts. */
    findRecovery(keyHash: string, now: Date, tx: Tx = db): Promise<StoredRecovery | null> {
      return tx.passwordRecovery.findFirst({
        where: { keyHash, expiresAt: { gt: now } },
        select: RECOVERY,
      });
    },

    async deleteRecovery(keyHash: string, tx: Tx = db): Promise<void> {
      await tx.passwordRecovery.deleteMany({ where: { keyHash } });
    },

    /**
     * Binds a reset link to the recovery `keyHash` names, opening it when there is none: the
     * recovery then names the link's account and ends with the link. A link is bound to one
     * recovery, so another bound to it ends. Nothing when the link ended meanwhile, as when a newer
     * delivered link replaced it after it was read: the binding finds no link to refer to.
     */
    async bindRecovery(
      keyHash: string,
      link: { id: number; userId: number; expiresAt: Date },
      { maskedEmail, now }: { maskedEmail: string; now: Date },
      tx: Tx = db,
    ): Promise<StoredRecovery | null> {
      await tx.passwordRecovery.deleteMany({
        where: { resetTokenId: link.id, keyHash: { not: keyHash } },
      });
      const bound = {
        userId: link.userId,
        maskedEmail,
        resetTokenId: link.id,
        expiresAt: link.expiresAt,
      };
      try {
        return await tx.passwordRecovery.upsert({
          where: { keyHash },
          update: bound,
          create: { keyHash, sentAt: now, ...bound },
          select: RECOVERY,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
          return null;
        }
        throw error;
      }
    },

    /**
     * Records one more link asked for, in one statement, only while the recovery has no link
     * checked, has asks left and is past its window, so concurrent asks cannot pass the bound. The
     * recovery afterwards, if this call recorded it.
     */
    async recordResend(
      id: number,
      { now, windowStart, maxResends, expiresAt }: RecordedResend,
      tx: Tx = db,
    ): Promise<StoredRecovery | null> {
      const { count } = await tx.passwordRecovery.updateMany({
        where: {
          id,
          resetTokenId: null,
          resends: { lt: maxResends },
          sentAt: { lte: windowStart },
          expiresAt: { gt: now },
        },
        data: { resends: { increment: 1 }, sentAt: now, expiresAt },
      });
      return count === 1
        ? tx.passwordRecovery.findUnique({ where: { id }, select: RECOVERY })
        : null;
    },
  };
}

/** A resend's clock: the time now, the window it must be past, the bound, and the new expiry. */
export interface RecordedResend {
  now: Date;
  windowStart: Date;
  maxResends: number;
  expiresAt: Date;
}

export type SessionsRepository = ReturnType<typeof createSessionsRepository>;
