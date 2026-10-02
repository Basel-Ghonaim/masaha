import {
  NAME_MAX_LENGTH,
  textSchema,
  type ChangePasswordRequest,
  type Language,
  type RegisterRequest,
} from '@masaha/shared';

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

/** A person Google has verified (the auth module's Google port). */
export interface GoogleAccount {
  subject: string;
  email: string;
  name: string | undefined;
}

// A Google name becomes the account's name when it is valid user text, else the email's local part.
const googleName = textSchema(1, NAME_MAX_LENGTH);

/** Credentials that matched. `confirm` re-checks them under the session lock (conventions §13). */
export interface VerifiedCredentials {
  account: Account;
  confirm(tx: Tx): Promise<Account>;
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
  function maySignIn(account: Account): boolean {
    return !account.suspendedAt;
  }

  function assertMaySignIn(account: Account): void {
    if (!maySignIn(account)) throw AppError.forbidden('ACCOUNT_SUSPENDED', 'Account suspended');
  }

  /**
   * Takes the user's session lock, and reads the account under it (conventions §13). Every
   * transaction that writes the user's refresh tokens takes it first, so a revocation and a new
   * session never interleave. Nothing when the account no longer exists.
   */
  async function lockAccount(id: number, tx: Tx): Promise<Account | null> {
    return (await repository.lock(id, tx)) ? repository.findById(id, tx) : null;
  }

  /** The account, or a 401 when it no longer exists. */
  async function get(id: number, tx?: Tx): Promise<Account> {
    const account = await repository.findById(id, tx);
    if (!account) throw AppError.unauthorized(undefined, 'Account not found');
    return account;
  }

  return {
    maySignIn,
    assertMaySignIn,
    lockAccount,

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
    async verifyCredentials(email: string, password: string): Promise<VerifiedCredentials> {
      const found = await repository.findCredentials(email);
      const matched = found?.passwordHash ?? null;
      if (!(await verifyPassword(password, matched)) || !found) {
        throw AppError.unauthorized('INVALID_CREDENTIALS', 'Invalid credentials');
      }
      assertMaySignIn(found.account);
      const { id } = found.account;
      return {
        account: found.account,
        // bcrypt ran outside any transaction; under the lock, the hash it matched must still be
        // the account's, or a reset or a change landed meanwhile.
        async confirm(tx) {
          const locked = await lockAccount(id, tx);
          if (!locked || (await repository.findPasswordHash(id, tx)) !== matched) {
            throw AppError.unauthorized('INVALID_CREDENTIALS', 'Invalid credentials');
          }
          assertMaySignIn(locked);
          return locked;
        },
      };
    },

    /**
     * The account a verified Google identity opens (docs/backend/security.md › Sign-in methods): the
     * one already linked to it; else the account with its verified email, which it links
     * (`linked`); else a new USER without a password. Only then does a suspension show.
     */
    async signInWithGoogle(
      google: GoogleAccount,
      language: Language | undefined,
    ): Promise<{ account: Account; linked: boolean }> {
      const known = await repository.findByGoogleSubject(google.subject);
      if (known) {
        assertMaySignIn(known);
        return { account: known, linked: false };
      }

      const byEmail = await repository.findByEmail(google.email);
      if (byEmail) {
        // Another Google account is already linked to this email's account: never replaced silently.
        if (byEmail.googleSubject) {
          throw AppError.unauthorized('GOOGLE_TOKEN_INVALID', 'Linked to another Google account');
        }
        assertMaySignIn(byEmail.account);
        return {
          account: await repository.linkGoogle(byEmail.account.id, google.subject),
          linked: true,
        };
      }

      const parsedName = googleName.safeParse(google.name);
      const account = await repository.create({
        email: google.email,
        name: parsedName.success ? parsedName.data : (google.email.split('@')[0] ?? google.email),
        passwordHash: null,
        googleSubject: google.subject,
        language,
      });
      return { account, linked: false };
    },

    get,

    /** The account with this email, if there is one. */
    async findByEmail(email: string, tx?: Tx): Promise<Account | null> {
      return (await repository.findByEmail(email, tx))?.account ?? null;
    },

    /** Hashes a new password, before the transaction that sets it opens. */
    hashPassword(password: string): Promise<string> {
      return hashPassword(password);
    },

    /** Sets a password already hashed, settling a pending temporary one. */
    async setPassword(userId: number, passwordHash: string, tx?: Tx): Promise<void> {
      await repository.setPassword(userId, passwordHash, tx);
    },

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
      const expected = {
        passwordHash: currentHash,
        mustChangePassword: account.mustChangePassword,
      };
      const { changed, issued } = await runInTransaction(async (tx) => {
        // The update takes the session lock; it applies only to the password that was checked.
        const changed = await repository.setPasswordIf(userId, passwordHash, expected, tx);
        if (!changed) {
          throw AppError.badRequest('CURRENT_PASSWORD_INCORRECT', 'Password changed meanwhile');
        }
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
