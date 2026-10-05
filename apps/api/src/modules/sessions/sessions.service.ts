import type { Tx } from '../../db/index.ts';
import {
  createSessionsRepository,
  type SessionsRepository,
  type StoredRecovery,
} from './sessions.repository.ts';
import { hashToken, newToken } from './tokens.ts';

// docs/backend/security.md › Tokens and cookies.
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60_000;
/** A token rotated this recently is still honoured, so two tabs refreshing together stay signed in. */
export const ROTATION_GRACE_MS = 30_000;
// docs/backend/security.md › Passwords.
export const RESET_TOKEN_TTL_MS = 60 * 60_000;
/** How long a recovery waits before another link may be asked for, the same for every address. */
export const RECOVERY_RESEND_WINDOW_MS = 60_000;
/** How many more links one recovery may ask for. */
export const RECOVERY_MAX_RESENDS = 3;

/** A refresh token to hand to the client, once: only its hash is stored. */
export interface IssuedToken {
  token: string;
}

export type Rotation =
  | { outcome: 'rotated'; issued: IssuedToken }
  /** Unknown or expired. */
  | { outcome: 'invalid' }
  /** Rotated before the grace window: a copy is in use, so its whole session was ended. */
  | { outcome: 'reused' };

/**
 * A recovery as its holder may see it: where it stands, never the address behind it. `linkChecked`
 * once a reset link was checked in its browser; until then it may ask for another link while
 * `canResend`, once `resendInSeconds` reaches 0.
 */
export interface Recovery {
  id: number;
  /** The account behind the address typed, when it may sign in. Never disclosed. */
  userId: number | null;
  maskedEmail: string;
  emailDigest: string | null;
  linkChecked: boolean;
  resendInSeconds: number;
  canResend: boolean;
  /** Until it ends: the cookie that holds its key lives as long. */
  remainingMs: number;
}

/** A new recovery, and the key its browser holds: only the key's hash is stored. */
export interface OpenedRecovery {
  key: string;
  recovery: Recovery;
}

interface Dependencies {
  repository?: SessionsRepository;
  now?: () => Date;
}

/**
 * The tokens of identity (ADR 0013): the refresh tokens (issue, rotate with the grace window, end a
 * session, revoke all), the password-reset tokens (issue, keep the delivered one, withdraw, check,
 * consume, end) and the recoveries that hold them (open, read, ask again, bind a link, use it,
 * end). It knows only a user's
 * id; of an address, only what it is handed, masked and digested. A session is a family of refresh
 * tokens.
 */
export function createSessionsService({
  repository = createSessionsRepository(),
  now = () => new Date(),
}: Dependencies = {}) {
  async function issueInFamily(userId: number, familyId: number | undefined, at: Date, tx?: Tx) {
    const token = newToken();
    const expiresAt = new Date(at.getTime() + REFRESH_TOKEN_TTL_MS);
    const stored = await repository.createRefreshToken(
      { userId, tokenHash: hashToken(token), expiresAt, familyId },
      tx,
    );
    return { stored, issued: { token } };
  }

  function recoveryOf(stored: StoredRecovery, at: Date): Recovery {
    const windowEnds = stored.sentAt.getTime() + RECOVERY_RESEND_WINDOW_MS;
    return {
      id: stored.id,
      userId: stored.userId,
      maskedEmail: stored.maskedEmail,
      emailDigest: stored.emailDigest,
      linkChecked: stored.resetTokenId !== null,
      resendInSeconds: Math.max(0, Math.ceil((windowEnds - at.getTime()) / 1000)),
      canResend: stored.resetTokenId === null && stored.resends < RECOVERY_MAX_RESENDS,
      remainingMs: stored.expiresAt.getTime() - at.getTime(),
    };
  }

  return {
    /** Starts a new session for the user: the first token of a new family. */
    async issue(userId: number, tx?: Tx): Promise<IssuedToken> {
      const at = now();
      await repository.deleteExpired(userId, at, tx);
      const { issued } = await issueInFamily(userId, undefined, at, tx);
      return issued;
    },

    /** Whose token this is, if it is known and unexpired, rotated or not. Changes nothing. */
    async ownerOf(token: string): Promise<number | undefined> {
      const stored = await repository.findRefreshToken(hashToken(token));
      return stored && stored.expiresAt > now() ? stored.userId : undefined;
    },

    /** Whose token this is, expired or not: the session a logout ends. Changes nothing. */
    async holderOf(token: string, tx?: Tx): Promise<number | undefined> {
      return (await repository.findRefreshToken(hashToken(token), tx))?.userId;
    },

    /**
     * Replaces the token with the next one of its session. Runs in the caller's transaction, after
     * the caller took the user's session lock (conventions §13).
     */
    async rotate(token: string, tx: Tx): Promise<Rotation> {
      const at = now();
      const stored = await repository.findRefreshToken(hashToken(token), tx);
      if (!stored || stored.expiresAt <= at) return { outcome: 'invalid' };

      if (stored.rotatedAt && at.getTime() - stored.rotatedAt.getTime() > ROTATION_GRACE_MS) {
        await repository.deleteFamily(stored.familyId, tx);
        return { outcome: 'reused' };
      }

      // A session that keeps refreshing never signs in again, so its expired rows go here: a
      // live session keeps the tokens of its last 7 days, which reuse detection needs.
      await repository.deleteExpired(stored.userId, at, tx);
      const next = await issueInFamily(stored.userId, stored.familyId, at, tx);
      // Within the grace window the token already has its successor, and the new token joins the
      // session beside it. Otherwise it is marked rotated now: the session lock means no concurrent
      // refresh can have done it first.
      if (!stored.rotatedAt && !(await repository.markRotated(stored.id, next.stored.id, at, tx))) {
        throw new Error('A refresh token was rotated concurrently, despite the session lock');
      }
      return { outcome: 'rotated', issued: next.issued };
    },

    /** Ends the token's session, every token of its family. Unknown tokens are ignored. */
    async end(token: string, tx?: Tx): Promise<void> {
      const stored = await repository.findRefreshToken(hashToken(token), tx);
      if (stored) await repository.deleteFamily(stored.familyId, tx);
    },

    /** Ends every session of the user. */
    async revokeAll(userId: number, tx?: Tx): Promise<void> {
      await repository.deleteUserTokens(userId, tx);
    },

    /**
     * A password-reset token for the user, single use, valid for an hour. The earlier link stays
     * live until this one is delivered (`keepOnlyResetToken`), or this one is withdrawn.
     */
    async issueResetToken(userId: number, tx?: Tx): Promise<{ token: string; id: number }> {
      const token = newToken();
      const id = await repository.createResetToken(
        userId,
        hashToken(token),
        new Date(now().getTime() + RESET_TOKEN_TTL_MS),
        tx,
      );
      return { token, id };
    },

    /** The reset token `id` was delivered: it alone stays live, the older links end. */
    async keepOnlyResetToken(userId: number, id: number, tx?: Tx): Promise<void> {
      await repository.deleteOlderUnusedResetTokens(userId, id, tx);
    },

    /**
     * Ends every reset link of the user, used or not: a changed password makes a pending link
     * pointless, and a used one is kept no longer than its transaction.
     */
    async endResetTokens(userId: number, tx?: Tx): Promise<void> {
      await repository.deleteUserResetTokens(userId, tx);
    },

    /** The reset token `id` was not delivered: it ends, and the link already sent stays live. */
    async withdrawResetToken(id: number, tx?: Tx): Promise<void> {
      await repository.deleteResetToken(id, tx);
    },

    /** Whose valid reset token this is. Reading it neither uses it nor extends it. */
    resetTokenOwner(token: string, tx?: Tx): Promise<number | undefined> {
      return repository.findResetTokenOwner(hashToken(token), now(), tx);
    },

    /**
     * Opens a recovery for an address, ending the one the browser held (`replacing`, its key). It
     * lasts as long as a reset link, and may ask for another link once its window has passed.
     */
    async openRecovery({
      userId,
      maskedEmail,
      emailDigest,
      replacing,
    }: {
      userId?: number;
      maskedEmail: string;
      emailDigest: string;
      replacing?: string;
    }): Promise<OpenedRecovery> {
      const at = now();
      if (replacing) await repository.deleteRecovery(hashToken(replacing));
      const key = newToken();
      const stored = await repository.createRecovery({
        keyHash: hashToken(key),
        userId,
        maskedEmail,
        emailDigest,
        sentAt: at,
        expiresAt: new Date(at.getTime() + RESET_TOKEN_TTL_MS),
      });
      return { key, recovery: recoveryOf(stored, at) };
    },

    /** The recovery this key opens, while it lasts. */
    async recovery(key: string | undefined): Promise<Recovery | undefined> {
      if (!key) return undefined;
      const at = now();
      const stored = await repository.findRecovery(hashToken(key), at);
      return stored ? recoveryOf(stored, at) : undefined;
    },

    /**
     * Records one more link asked for: the window starts again, and the recovery lasts as long as
     * the new link. Nothing when the recovery cannot ask now (a link checked, its asks spent, its
     * window not passed, or a concurrent ask recorded first).
     */
    async recordResend(id: number): Promise<Recovery | undefined> {
      const at = now();
      const stored = await repository.recordResend(id, {
        now: at,
        windowStart: new Date(at.getTime() - RECOVERY_RESEND_WINDOW_MS),
        maxResends: RECOVERY_MAX_RESENDS,
        expiresAt: new Date(at.getTime() + RESET_TOKEN_TTL_MS),
      });
      return stored ? recoveryOf(stored, at) : undefined;
    },

    /**
     * Binds a reset link to the browser's recovery (`key`), or opens one for it when the browser
     * holds none: most people open the email on another device. Runs in the caller's transaction,
     * after the caller took the link's owner's session lock (conventions §13). Nothing when the
     * link is unknown, expired or used, or ended while it was being bound.
     */
    async bindRecovery(
      token: string,
      { key, maskedEmail }: { key: string | undefined; maskedEmail: string },
      tx: Tx,
    ): Promise<OpenedRecovery | undefined> {
      const at = now();
      const link = await repository.findValidResetToken(hashToken(token), at, tx);
      if (!link) return undefined;
      const held =
        key && (await repository.findRecovery(hashToken(key), at, tx)) ? key : newToken();
      const stored = await repository.bindRecovery(
        hashToken(held),
        link,
        { maskedEmail, now: at },
        tx,
      );
      return stored ? { key: held, recovery: recoveryOf(stored, at) } : undefined;
    },

    /**
     * Uses the reset link bound to the recovery this key opens, once. Whose it was, if both were
     * still valid. Runs in the caller's transaction, under the owner's session lock.
     */
    consumeRecoveryLink(key: string, tx: Tx): Promise<number | undefined> {
      return repository.consumeRecoveryLink(hashToken(key), now(), tx);
    },
  };
}

export type SessionsService = ReturnType<typeof createSessionsService>;
