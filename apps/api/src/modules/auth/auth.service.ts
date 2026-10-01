import type { LoginRequest, RegisterRequest, Session } from '@masaha/shared';

import type { RunInTransaction } from '../../db/index.ts';
import type { AccessTokens } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { Limiter } from '../../shared/rate-limit/index.ts';
import type { SessionsService } from '../sessions/index.ts';
import type { SpaceLinksService } from '../space-links/index.ts';
import type { Account, UsersService } from '../users/index.ts';
import { REFRESH, SIGN_IN_ACCOUNT, SIGN_IN_ADDRESS } from './auth.limits.ts';

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
}: Dependencies) {
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

  async function signIn(account: Account): Promise<SignedIn> {
    const { token } = await sessions.issue(account.id);
    return { session: await sessionFor(account), refreshToken: token };
  }

  /**
   * Runs a sign-in attempt under the failure limits: refused once they are reached, and a failure
   * is counted here, where it is decided, before it is answered. A success counts nothing.
   */
  async function limitFailures<T>(
    address: string,
    email: string | undefined,
    attempt: () => Promise<T>,
  ): Promise<T> {
    await limiter.check(SIGN_IN_ADDRESS, address);
    if (email !== undefined) await limiter.check(SIGN_IN_ACCOUNT, address, email);
    try {
      return await attempt();
    } catch (error) {
      if (error instanceof AppError && error.status < 500) {
        await limiter.recordFailure(SIGN_IN_ADDRESS, address);
        if (email !== undefined) await limiter.recordFailure(SIGN_IN_ACCOUNT, address, email);
      }
      throw error;
    }
  }

  return {
    register(request: RegisterRequest, address: string): Promise<SignedIn> {
      return limitFailures(address, request.email, async () =>
        signIn(await users.register(request)),
      );
    },

    login({ email, password }: LoginRequest, address: string): Promise<SignedIn> {
      return limitFailures(address, email, async () =>
        signIn(await users.verifyCredentials(email, password)),
      );
    },

    /** Rotates the refresh token and restores the session: who is signed in, in one request (ADR 0003). */
    async refresh(refreshToken: string | undefined): Promise<SignedIn> {
      const userId = refreshToken && (await sessions.ownerOf(refreshToken));
      if (!refreshToken || !userId) throw AppError.unauthorized(undefined, 'No valid session');
      await limiter.count(REFRESH, String(userId));

      const account = await users.get(userId);
      try {
        users.assertMaySignIn(account);
      } catch (error) {
        await sessions.revokeAll(userId);
        throw error;
      }

      const rotation = await runInTransaction((tx) => sessions.rotate(refreshToken, tx));
      if (rotation.outcome !== 'rotated')
        throw AppError.unauthorized(undefined, 'No valid session');
      return { session: await sessionFor(account), refreshToken: rotation.issued.token };
    },

    /** Ends this device's session. Without a session there is nothing to end. */
    async logout(refreshToken: string | undefined): Promise<void> {
      if (refreshToken) await sessions.end(refreshToken);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
