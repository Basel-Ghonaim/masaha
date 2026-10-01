import type { Tx } from '../../db/index.ts';
import { createSessionsRepository, type SessionsRepository } from './sessions.repository.ts';
import { hashToken, newToken } from './tokens.ts';

// docs/backend/security.md › Tokens and cookies.
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60_000;
/** A token rotated this recently is still honoured, so two tabs refreshing together stay signed in. */
export const ROTATION_GRACE_MS = 30_000;
// docs/backend/security.md › Passwords.
export const RESET_TOKEN_TTL_MS = 60 * 60_000;

/** A refresh token to hand to the client, once: only its hash is stored. */
export interface IssuedToken {
  token: string;
  expiresAt: Date;
}

export type Rotation =
  | { outcome: 'rotated'; userId: number; issued: IssuedToken }
  /** Unknown or expired. */
  | { outcome: 'invalid' }
  /** Rotated before the grace window: a copy is in use, so its whole session was ended. */
  | { outcome: 'reused' };

interface Dependencies {
  repository?: SessionsRepository;
  now?: () => Date;
}

/**
 * The refresh tokens (ADR 0013): issue, rotate with the grace window, end a session, revoke all.
 * It knows only a user's id. A session is a family of tokens, one per rotation.
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
    return { stored, issued: { token, expiresAt } };
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

    /** Replaces the token with the next one of its session. Runs in the caller's transaction. */
    async rotate(token: string, tx: Tx): Promise<Rotation> {
      const at = now();
      const stored = await repository.findRefreshToken(hashToken(token), tx);
      if (!stored || stored.expiresAt <= at) return { outcome: 'invalid' };

      if (stored.rotatedAt && at.getTime() - stored.rotatedAt.getTime() > ROTATION_GRACE_MS) {
        await repository.deleteFamily(stored.familyId, tx);
        return { outcome: 'reused' };
      }

      const next = await issueInFamily(stored.userId, stored.familyId, at, tx);
      // Within the grace window, or when a concurrent refresh rotated it first, the token already
      // has its successor; the new token joins the session beside it.
      if (!stored.rotatedAt) await repository.markRotated(stored.id, next.stored.id, at, tx);
      return { outcome: 'rotated', userId: stored.userId, issued: next.issued };
    },

    /** Ends the token's session, every token of its family. Unknown tokens are ignored. */
    async end(token: string): Promise<void> {
      const stored = await repository.findRefreshToken(hashToken(token));
      if (stored) await repository.deleteFamily(stored.familyId);
    },

    /** Ends every session of the user. */
    async revokeAll(userId: number, tx?: Tx): Promise<void> {
      await repository.deleteUserTokens(userId, tx);
    },

    /** A password-reset token for the user, single use, valid for an hour. Any earlier one ends. */
    async issueResetToken(userId: number): Promise<string> {
      const token = newToken();
      await repository.replaceResetToken(
        userId,
        hashToken(token),
        new Date(now().getTime() + RESET_TOKEN_TTL_MS),
      );
      return token;
    },

    /** Whose valid reset token this is. Reading it neither uses it nor extends it. */
    resetTokenOwner(token: string): Promise<number | undefined> {
      return repository.findResetTokenOwner(hashToken(token), now());
    },

    /** Uses the reset token, once. Whose it was, if it was still valid. */
    consumeResetToken(token: string, tx: Tx): Promise<number | undefined> {
      return repository.consumeResetToken(hashToken(token), now(), tx);
    },
  };
}

export type SessionsService = ReturnType<typeof createSessionsService>;
