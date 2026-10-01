import type { ChangePasswordRequest, RegisterRequest } from '@masaha/shared';

import { createRunInTransaction, type RunInTransaction, type Tx } from '../../db/index.ts';
import type { AccessTokens } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import { createSessionsService, type SessionsService } from '../sessions/index.ts';
import { hashPassword, verifyPassword } from './password.ts';
import { toUserView, type UserView } from './users.mapper.ts';
import { createUsersRepository, type Account, type UsersRepository } from './users.repository.ts';

interface Dependencies {
  accessTokens: AccessTokens;
  repository?: UsersRepository;
  sessions?: SessionsService;
  runInTransaction?: RunInTransaction;
}

/** A changed password: the device's session goes on with these, and every other one has ended. */
export interface PasswordChange {
  accessToken: string;
  refreshToken: string;
}

/**
 * The account (ADR 0013): identity, credentials, the temporary password and the forced change,
 * suspension and the role. Every rule about who may sign in lives here.
 */
export function createUsersService({
  accessTokens,
  repository = createUsersRepository(),
  sessions = createSessionsService(),
  runInTransaction = createRunInTransaction(),
}: Dependencies) {
  /** A suspended account cannot sign in or refresh (docs/backend/security.md). */
  function assertMaySignIn(account: Account): void {
    if (account.suspendedAt) throw AppError.forbidden('ACCOUNT_SUSPENDED', 'Account suspended');
  }

  /** The account, or a 401 when it no longer exists. */
  async function get(id: number, tx?: Tx): Promise<Account> {
    const account = await repository.findById(id, tx);
    if (!account) throw AppError.unauthorized(undefined, 'Account not found');
    return account;
  }

  return {
    assertMaySignIn,

    /** A new USER with a password. A taken email is EMAIL_TAKEN. */
    async register({ name, email, password, language }: RegisterRequest): Promise<Account> {
      const passwordHash = await hashPassword(password);
      return repository.create({ name, email, passwordHash, language });
    },

    /**
     * The account these credentials open. Every mismatch is the same INVALID_CREDENTIALS: an unknown
     * email, a wrong password, or an account with no password (Google only). Only once the password
     * matches does a suspension show.
     */
    async verifyCredentials(email: string, password: string): Promise<Account> {
      const found = await repository.findCredentials(email);
      if (!(await verifyPassword(password, found?.passwordHash ?? null)) || !found) {
        throw AppError.unauthorized('INVALID_CREDENTIALS', 'Invalid credentials');
      }
      assertMaySignIn(found.account);
      return found.account;
    },

    get,

    async view(account: Account, tx?: Tx): Promise<UserView> {
      return toUserView(account, await repository.hasPassword(account.id, tx));
    },

    /**
     * Sets the user's password (docs/backend/security.md › Passwords). The current password is
     * required, except while a temporary one is pending (the forced change) and for a Google-only
     * account's first password. Every session of the user ends, and this device's goes on in a new
     * one, without the pending change.
     */
    async changePassword(
      userId: number,
      { currentPassword, password }: ChangePasswordRequest,
    ): Promise<PasswordChange> {
      const account = await get(userId);
      assertMaySignIn(account);

      const currentHash = await repository.findPasswordHash(userId);
      if (currentHash && !account.mustChangePassword) {
        if (currentPassword === undefined)
          throw AppError.validation({ currentPassword: ['required'] });
        if (!(await verifyPassword(currentPassword, currentHash))) {
          throw AppError.badRequest('CURRENT_PASSWORD_INCORRECT', 'Current password incorrect');
        }
      }

      const passwordHash = await hashPassword(password);
      const { changed, issued } = await runInTransaction(async (tx) => {
        const changed = await repository.setPassword(userId, passwordHash, tx);
        await sessions.revokeAll(userId, tx);
        return { changed, issued: await sessions.issue(userId, tx) };
      });
      const accessToken = await accessTokens.sign({
        userId,
        role: changed.role,
        mustChangePassword: changed.mustChangePassword,
      });
      return { accessToken, refreshToken: issued.token };
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
