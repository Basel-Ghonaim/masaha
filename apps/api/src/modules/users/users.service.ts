import type { RegisterRequest } from '@masaha/shared';

import type { Tx } from '../../db/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import { hashPassword, verifyPassword } from './password.ts';
import { toUserView, type UserView } from './users.mapper.ts';
import { createUsersRepository, type Account, type UsersRepository } from './users.repository.ts';

interface Dependencies {
  repository?: UsersRepository;
}

/**
 * The account (ADR 0013): identity, credentials, the temporary password and the forced change,
 * suspension and the role. Every rule about who may sign in lives here.
 */
export function createUsersService({ repository = createUsersRepository() }: Dependencies = {}) {
  /** A suspended account cannot sign in or refresh (docs/backend/security.md). */
  function assertMaySignIn(account: Account): void {
    if (account.suspendedAt) throw AppError.forbidden('ACCOUNT_SUSPENDED', 'Account suspended');
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

    /** The account, or a 401 when it no longer exists. */
    async get(id: number, tx?: Tx): Promise<Account> {
      const account = await repository.findById(id, tx);
      if (!account) throw AppError.unauthorized(undefined, 'Account not found');
      return account;
    },

    async view(account: Account, tx?: Tx): Promise<UserView> {
      return toUserView(account, await repository.hasPassword(account.id, tx));
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
