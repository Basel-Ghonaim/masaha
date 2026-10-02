import type {
  ForgotPasswordRequest,
  GoogleSignInRequest,
  LoginRequest,
  RegisterRequest,
  ResetCheck,
  ResetPasswordRequest,
  Session,
} from '@masaha/shared';

import type { RunInTransaction } from '../../db/index.ts';
import type { AccessTokens } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { Limiter } from '../../shared/rate-limit/index.ts';
import type { SessionsService } from '../sessions/index.ts';
import type { SpaceLinksService } from '../space-links/index.ts';
import type { Account, UsersService } from '../users/index.ts';
import {
  PASSWORD_ADDRESS,
  PASSWORD_EMAIL,
  PASSWORD_TOKEN,
  REFRESH,
  SIGN_IN_ACCOUNT,
  SIGN_IN_ADDRESS,
} from './auth.limits.ts';
import type { EmailSender } from './email/emailSender.ts';
import { resetEmail, resetLink } from './email/resetEmail.ts';
import type { GoogleIdentity } from './google.ts';

/** A session for the body, and its refresh token for the cookie. */
export interface SignedIn {
  session: Session;
  refreshToken: string;
}

interface Dependencies {
  users: UsersService;
  sessions: SessionsService;
  spaceLinks: SpaceLinksService;
  accessTokens: AccessTokens;
  limiter: Limiter;
  runInTransaction: RunInTransaction;
  /** Absent when no Google client id is configured: Google sign-in is then unavailable. */
  google: GoogleIdentity | undefined;
  /** The reset email's sender, behind its caps. */
  email: EmailSender;
  /** The web's origin, where the reset link leads. */
  webOrigin: string;
}

/**
 * The sign-in flows (ADR 0013), as an orchestrator with no data of its own: it combines `users`,
 * `sessions` and `space-links`. Every rule about who may sign in is the users module's.
 */
export function createAuthService({
  users,
  sessions,
  spaceLinks,
  accessTokens,
  limiter,
  runInTransaction,
  google,
  email,
  webOrigin,
}: Dependencies) {
  const invalidResetLink = () =>
    AppError.badRequest('RESET_TOKEN_INVALID', 'Reset token invalid, expired or used');

  /** The user, their space links and a new access token, for a session whose refresh token exists. */
  async function sessionFor(account: Account): Promise<Session> {
    const [user, spaces, accessToken] = await Promise.all([
      users.view(account),
      spaceLinks.activeLinksFor(account.id),
      accessTokens.sign({
        userId: account.id,
        role: account.role,
        mustChangePassword: account.mustChangePassword,
      }),
    ]);
    return { user: { ...user, spaces }, accessToken };
  }

  /** Opens a session for the user, under their session lock (conventions §13). */
  async function signIn(userId: number): Promise<SignedIn> {
    const { account, token } = await runInTransaction(async (tx) => {
      const locked = await users.lockAccount(userId, tx);
      if (!locked) throw AppError.unauthorized(undefined, 'Account not found');
      users.assertMaySignIn(locked);
      return { account: locked, token: (await sessions.issue(userId, tx)).token };
    });
    return { session: await sessionFor(account), refreshToken: token };
  }

  /**
   * Runs a sign-in attempt under the failure limits (docs/backend/security.md › Rate limits): by
   * address, and by address and email when there is one. The limiter reserves each slot first and
   * gives it back on a success, so a concurrent burst cannot pass them.
   */
  function limitFailures<T>(
    address: string,
    email: string | undefined,
    attempt: () => Promise<T>,
  ): Promise<T> {
    return limiter.limitFailures(
      [
        { policy: SIGN_IN_ADDRESS, by: [address] },
        ...(email === undefined ? [] : [{ policy: SIGN_IN_ACCOUNT, by: [address, email] }]),
      ],
      attempt,
    );
  }

  return {
    register(request: RegisterRequest, address: string): Promise<SignedIn> {
      return limitFailures(address, request.email, async () =>
        signIn((await users.register(request)).id),
      );
    },

    login({ email, password }: LoginRequest, address: string): Promise<SignedIn> {
      return limitFailures(address, email, async () => {
        const verified = await users.verifyCredentials(email, password);
        // The credentials are confirmed again under the lock, so a reset that landed during bcrypt
        // is never followed by a new session.
        const { account, token } = await runInTransaction(async (tx) => {
          const confirmed = await verified.confirm(tx);
          return { account: confirmed, token: (await sessions.issue(confirmed.id, tx)).token };
        });
        return { session: await sessionFor(account), refreshToken: token };
      });
    },

    /**
     * Signs in with a Google ID token, creating or linking the account. A failure has no email to
     * count by, so it counts on the address only.
     */
    async google(
      { idToken, language }: GoogleSignInRequest,
      address: string,
    ): Promise<SignedIn & { linked: boolean }> {
      if (!google) throw AppError.serviceUnavailable(undefined, 'Google sign-in is not configured');
      return limitFailures(address, undefined, async () => {
        const profile = await google.verify(idToken);
        if (!profile)
          throw AppError.unauthorized('GOOGLE_TOKEN_INVALID', 'Invalid Google ID token');
        const { account, linked } = await users.signInWithGoogle(profile, language);
        return { ...(await signIn(account.id)), linked };
      });
    },

    /** Rotates the refresh token and restores the session: who is signed in, in one request (ADR 0003). */
    async refresh(refreshToken: string | undefined): Promise<SignedIn> {
      if (!refreshToken) throw AppError.unauthorized(undefined, 'No session');
      const userId = await sessions.ownerOf(refreshToken);
      if (!userId) throw AppError.unauthorized(undefined, 'No valid session');
      await limiter.count(REFRESH, String(userId));

      // Under the session lock, so a revocation that committed first is seen.
      const result = await runInTransaction(async (tx) => {
        const account = await users.lockAccount(userId, tx);
        if (!account) return { outcome: 'invalid' } as const;
        if (!users.maySignIn(account)) {
          await sessions.revokeAll(userId, tx);
          return { outcome: 'refused', account } as const;
        }
        const rotation = await sessions.rotate(refreshToken, tx);
        return rotation.outcome === 'rotated'
          ? ({ outcome: 'rotated', account, token: rotation.issued.token } as const)
          : ({ outcome: 'invalid' } as const);
      });

      if (result.outcome === 'refused') users.assertMaySignIn(result.account);
      if (result.outcome !== 'rotated') throw AppError.unauthorized(undefined, 'No valid session');
      return { session: await sessionFor(result.account), refreshToken: result.token };
    },

    /**
     * Emails a reset link when the email has an account that may sign in. The caller learns nothing
     * either way: the answer is the same, and a failed send is only logged.
     */
    async forgotPassword({ email: address }: ForgotPasswordRequest, from: string): Promise<void> {
      await limiter.count(PASSWORD_ADDRESS, from);
      await limiter.count(PASSWORD_EMAIL, from, address);

      const account = await users.findByEmail(address);
      if (!account || account.suspendedAt) return;
      const { token, id } = await sessions.issueResetToken(account.id);
      const result = await email.send(
        resetEmail({ to: account.email, name: account.name, link: resetLink(webOrigin, token) }),
      );
      // Only a delivered link replaces the one already in the inbox (docs/backend/security.md).
      if (result.sent) await sessions.keepOnlyResetToken(account.id, id);
      else await sessions.withdrawResetToken(id);
    },

    /**
     * The account a reset link is for, so the page can name it. Reading the link neither uses it nor
     * extends it, and every failure is the same RESET_TOKEN_INVALID.
     */
    async checkResetToken(token: string, from: string): Promise<ResetCheck> {
      await limiter.count(PASSWORD_ADDRESS, from);
      await limiter.count(PASSWORD_TOKEN, from, token);

      const userId = await sessions.resetTokenOwner(token);
      if (!userId) throw invalidResetLink();
      return { email: (await users.get(userId)).email };
    },

    /** Sets the new password with the link, once, and ends every session of the user. */
    async resetPassword({ token, password }: ResetPasswordRequest, from: string): Promise<void> {
      await limiter.count(PASSWORD_ADDRESS, from);
      await limiter.count(PASSWORD_TOKEN, from, token);

      // Read first, so the lock is taken in the one order: the user, then their tokens.
      const owner = await sessions.resetTokenOwner(token);
      if (!owner) throw invalidResetLink();
      const passwordHash = await users.hashPassword(password);
      await runInTransaction(async (tx) => {
        await users.lockAccount(owner, tx);
        if ((await sessions.consumeResetToken(token, tx)) !== owner) throw invalidResetLink();
        await users.setPassword(owner, passwordHash, tx);
        await sessions.revokeAll(owner, tx);
      });
    },

    /** Ends this device's session. Without a session there is nothing to end. */
    async logout(refreshToken: string | undefined): Promise<void> {
      if (!refreshToken) return;
      await runInTransaction(async (tx) => {
        const userId = await sessions.holderOf(refreshToken, tx);
        if (!userId) return;
        await users.lockAccount(userId, tx);
        await sessions.end(refreshToken, tx);
      });
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
