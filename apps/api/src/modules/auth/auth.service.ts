import { createHash } from 'node:crypto';

import type {
  ForgotPasswordRequest,
  GoogleSignInRequest,
  LoginRequest,
  RecoveryPosition,
  RegisterRequest,
  ResetPasswordRequest,
  Session,
} from '@masaha/shared/auth';

import type { RunInTransaction } from '../../db/index.ts';
import type { AccessTokens } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { Limiter } from '../../shared/rate-limit/index.ts';
import type { Recovery, SessionsService } from '../sessions/index.ts';
import type { SpaceLinksService } from '../space-links/index.ts';
import type { Account, UsersService } from '../users/index.ts';
import {
  GOOGLE_ADDRESS,
  PASSWORD_ADDRESS,
  PASSWORD_EMAIL,
  PASSWORD_TOKEN,
  REFRESH,
  REGISTER_ADDRESS,
  SIGN_IN_ACCOUNT,
  SIGN_IN_ADDRESS,
} from './auth.limits.ts';
import type { EmailSender } from './email/emailSender.ts';
import { resetEmail, resetLink } from './email/resetEmail.ts';
import type { GoogleIdentity } from './google.ts';
import { maskEmail } from './maskEmail.ts';

/** A session for the body, and its refresh token for the cookie. */
export interface SignedIn {
  session: Session;
  refreshToken: string;
}

/** A recovery's position for the body, and its key and lifetime for the cookie. */
export interface RecoveryAnswer {
  position: RecoveryPosition;
  key: string;
  maxAgeMs: number;
}

/** Where a recovery stands, as its holder may see it (docs/api/api-contract.md §5). */
function positionOf(recovery: Recovery | undefined): RecoveryPosition {
  if (!recovery) return { step: 'request' };
  if (recovery.linkChecked) return { step: 'password', email: recovery.maskedEmail };
  return {
    step: 'sent',
    email: recovery.maskedEmail,
    resendInSeconds: recovery.resendInSeconds,
    canResend: recovery.canResend,
  };
}

/**
 * What a recovery stores of an address, and what the request's limit counts it by: a digest, so no
 * address is stored, and a resend counts under the same key as the request it repeats.
 */
function emailDigest(email: string): string {
  return createHash('sha256').update(email).digest('hex');
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
  emailSender: EmailSender;
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
  emailSender,
  webOrigin,
}: Dependencies) {
  const invalidResetLink = () =>
    AppError.badRequest('RESET_TOKEN_INVALID', 'Reset token invalid, expired or used');
  const invalidRecovery = () =>
    AppError.badRequest('RECOVERY_INVALID', 'No recovery in progress in this browser');

  /** The resend window has not passed: a 429 that says when it does. */
  function resendTooSoon(retryAfterSeconds: number): AppError {
    return AppError.rateLimit(undefined, 'Resend window not passed', {
      policy: 'password-resend',
      limit: 1,
      windowSeconds: retryAfterSeconds,
      retryAfterSeconds,
    });
  }

  /** Why this recovery may not ask for another link now, if it may not. */
  function resendRefusal(recovery: Recovery | undefined): AppError | undefined {
    if (!recovery?.emailDigest || recovery.linkChecked) return invalidRecovery();
    if (!recovery.canResend) {
      return AppError.badRequest('RESEND_LIMIT_REACHED', 'No resends left in this recovery');
    }
    if (recovery.resendInSeconds > 0) return resendTooSoon(recovery.resendInSeconds);
    return undefined;
  }

  /**
   * Emails the account a reset link. Only a delivered link replaces the one already in the inbox
   * (docs/backend/security.md); one that is not sent is withdrawn, and the failure only logged.
   */
  async function sendResetLink(account: Account, clientAddress: string): Promise<void> {
    const { token, id } = await sessions.issueResetToken(account.id);
    const result = await emailSender.send(
      resetEmail({ to: account.email, link: resetLink(webOrigin, token) }),
      { requester: clientAddress },
    );
    if (result.sent) await sessions.keepOnlyResetToken(account.id, id);
    else await sessions.withdrawResetToken(id);
  }

  /** The user, their space links and a new access token, for a session whose refresh token exists. */
  async function sessionFor(account: Account): Promise<Session> {
    const [user, spaces, accessToken] = await Promise.all([
      users.view(account),
      spaceLinks.activeLinksFor(account.id),
      accessTokens.sign(users.accessClaims(account)),
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
   * clientAddress, and by clientAddress and email when there is one. The limiter reserves each slot first and
   * gives it back on a success, so a concurrent burst cannot pass them.
   */
  function limitFailures<T>(
    clientAddress: string,
    email: string | undefined,
    attempt: () => Promise<T>,
  ): Promise<T> {
    return limiter.limitFailures(
      [
        { policy: SIGN_IN_ADDRESS, by: [clientAddress] },
        ...(email === undefined ? [] : [{ policy: SIGN_IN_ACCOUNT, by: [clientAddress, email] }]),
      ],
      attempt,
    );
  }

  return {
    async register(request: RegisterRequest, clientAddress: string): Promise<SignedIn> {
      await limiter.count(REGISTER_ADDRESS, clientAddress);
      return limitFailures(clientAddress, request.email, async () =>
        signIn((await users.register(request)).id),
      );
    },

    login({ email, password }: LoginRequest, clientAddress: string): Promise<SignedIn> {
      return limitFailures(clientAddress, email, async () => {
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
     * Signs in with a Google ID token, creating or linking the account. A failure counts under
     * Google's own per-clientAddress limit, so junk tokens never lock the clientAddress's password sign-ins.
     */
    async google(
      { idToken, language }: GoogleSignInRequest,
      clientAddress: string,
    ): Promise<SignedIn & { linked: boolean }> {
      if (!google) throw AppError.serviceUnavailable(undefined, 'Google sign-in is not configured');
      return limiter.limitFailures([{ policy: GOOGLE_ADDRESS, by: [clientAddress] }], async () => {
        const profile = await google.verify(idToken).catch((error: unknown) => {
          throw AppError.serviceUnavailable(
            undefined,
            `Google sign-in unavailable: ${error instanceof Error ? error.name : 'unknown'}`,
          );
        });
        if (!profile)
          throw AppError.unauthorized('GOOGLE_TOKEN_INVALID', 'Invalid Google ID token');
        const { userId, link } = await users.accountForGoogle(profile, language);
        if (!link) return { ...(await signIn(userId)), linked: false };
        const { account, linked, token } = await runInTransaction(async (tx) => {
          const result = await users.linkGoogle(userId, profile, tx);
          return { ...result, token: (await sessions.issue(userId, tx)).token };
        });
        return { session: await sessionFor(account), refreshToken: token, linked };
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
     * Opens a recovery in this browser, ending the one it held, and emails a reset link when the
     * email has an account that may sign in. The caller learns nothing either way: the position and
     * the cookie are the same for every address, and a failed send is only logged.
     */
    async forgotPassword(
      { email }: ForgotPasswordRequest,
      clientAddress: string,
      heldKey: string | undefined,
    ): Promise<RecoveryAnswer> {
      const digest = emailDigest(email);
      await limiter.count(PASSWORD_ADDRESS, clientAddress);
      await limiter.count(PASSWORD_EMAIL, clientAddress, digest);

      const account = await users.findByEmail(email);
      const holder = account && users.maySignIn(account) ? account : undefined;
      const { key, recovery } = await sessions.openRecovery({
        userId: holder?.id,
        maskedEmail: maskEmail(email),
        emailDigest: digest,
        replacing: heldKey,
      });
      if (holder) await sendResetLink(holder, clientAddress);
      return { position: positionOf(recovery), key, maxAgeMs: recovery.remainingMs };
    },

    /**
     * Asks the browser's recovery for another link, without an address: the recovery holds it. It
     * counts under the request's own limits, a recovery may ask 3 times, and once a minute. The
     * ask is recorded before the account is read, so the position moves the same for every address.
     */
    async resendResetLink(clientAddress: string, key: string | undefined): Promise<RecoveryAnswer> {
      await limiter.count(PASSWORD_ADDRESS, clientAddress);
      const recovery = await sessions.recovery(key);
      if (!key || !recovery?.emailDigest || recovery.linkChecked) throw invalidRecovery();
      await limiter.count(PASSWORD_EMAIL, clientAddress, recovery.emailDigest);
      const refused = resendRefusal(recovery);
      if (refused) throw refused;

      const renewed = await sessions.recordResend(recovery.id);
      // Not recorded: a concurrent ask was recorded first, or the recovery ended meanwhile.
      if (!renewed) throw resendRefusal(await sessions.recovery(key)) ?? resendTooSoon(1);
      if (renewed.userId !== null) {
        const account = await users.get(renewed.userId);
        if (users.maySignIn(account)) await sendResetLink(account, clientAddress);
      }
      return { position: positionOf(renewed), key, maxAgeMs: renewed.remainingMs };
    },

    /** Where the browser's recovery stands: `request` when it holds none. Never a refusal. */
    async recoveryPosition(key: string | undefined): Promise<RecoveryPosition> {
      return positionOf(await sessions.recovery(key));
    },

    /**
     * Checks a reset link and binds it to the browser's recovery, or opens one for it when the
     * browser holds none. Checking neither uses the link nor extends it, and every failure is the
     * same RESET_TOKEN_INVALID. From here on, the recovery holds the link: the web no longer does.
     */
    async checkResetToken(
      token: string,
      clientAddress: string,
      heldKey: string | undefined,
    ): Promise<RecoveryAnswer> {
      await limiter.count(PASSWORD_ADDRESS, clientAddress);
      await limiter.count(PASSWORD_TOKEN, clientAddress, token);

      // Read first, so the lock is taken in the one order: the user, then their tokens.
      const owner = await sessions.resetTokenOwner(token);
      if (!owner) throw invalidResetLink();
      const opened = await runInTransaction(async (tx) => {
        const account = await users.lockAccount(owner, tx);
        if (!account) return undefined;
        return sessions.bindRecovery(
          token,
          { key: heldKey, maskedEmail: maskEmail(account.email) },
          tx,
        );
      });
      if (!opened) throw invalidResetLink();
      const { key, recovery } = opened;
      return { position: positionOf(recovery), key, maxAgeMs: recovery.remainingMs };
    },

    /**
     * Sets the new password with the link the browser's recovery holds, once, and ends every
     * session of the user and every recovery bound to one of their links. A recovery not bound to a
     * link stays, as it does for an address with no account, so it tells nothing. A token is never
     * taken from the request.
     */
    async resetPassword(
      { password }: ResetPasswordRequest,
      clientAddress: string,
      key: string | undefined,
    ): Promise<void> {
      await limiter.count(PASSWORD_ADDRESS, clientAddress);
      if (!key) throw invalidRecovery();
      await limiter.count(PASSWORD_TOKEN, clientAddress, key);

      // Read first, so the lock is taken in the one order: the user, then their tokens.
      const recovery = await sessions.recovery(key);
      const owner = recovery?.linkChecked ? recovery.userId : null;
      if (owner === null) throw invalidRecovery();
      const passwordHash = await users.hashPassword(password);
      await runInTransaction(async (tx) => {
        await users.lockAccount(owner, tx);
        if ((await sessions.consumeRecoveryLink(key, tx)) !== owner) throw invalidRecovery();
        await users.setPassword(owner, passwordHash, tx);
        await sessions.revokeAll(owner, tx);
        // Ending the links ends the recoveries bound to them.
        await sessions.endResetTokens(owner, tx);
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
