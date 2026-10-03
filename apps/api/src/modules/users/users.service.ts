import {
  NAME_MAX_LENGTH,
  textSchema,
  type ChangePasswordRequest,
  type Language,
  type RegisterRequest,
} from '@masaha/shared';

import { createRunInTransaction, type RunInTransaction, type Tx } from '../../db/index.ts';
import type { AccessClaims, AccessTokens } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { Limiter } from '../../shared/rate-limit/index.ts';
import { createSessionsService, type SessionsService } from '../sessions/index.ts';
import { hashPassword, verifyPassword } from './password.ts';

/** bcrypt, as the users module uses it. */
export interface Passwords {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string | null): Promise<boolean>;
}
import { PASSWORD_CHANGE } from './users.limits.ts';
import { toUserView, type UserView } from './users.mapper.ts';
import { createUsersRepository, type Account, type UsersRepository } from './users.repository.ts';

interface Dependencies {
  accessTokens: AccessTokens;
  limiter: Limiter;
  repository?: UsersRepository;
  sessions?: SessionsService;
  runInTransaction?: RunInTransaction;
  passwords?: Passwords;
}

/** A person Google has verified (the auth module's Google port). */
export interface GoogleAccount {
  subject: string;
  email: string;
  name: string | undefined;
  hostedDomain: string | undefined;
}

/**
 * Whether Google is the authority for the address, so its `email_verified` proves who holds it:
 * a Gmail address, or one in the Google Workspace domain the token names. Elsewhere, a Google
 * account may belong to a former holder of the address (docs/backend/security.md).
 */
export function googleIsAuthoritative({ email, hostedDomain }: GoogleAccount): boolean {
  return email.endsWith('@gmail.com') || (!!hostedDomain && email.endsWith(`@${hostedDomain}`));
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
  limiter,
  repository = createUsersRepository(),
  sessions = createSessionsService(),
  runInTransaction = createRunInTransaction(),
  passwords = { hash: hashPassword, verify: verifyPassword },
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

  /** What the access token says of the account (docs/backend/security.md › Tokens and cookies). */
  function accessClaims(account: Account): AccessClaims {
    return {
      userId: account.id,
      role: account.role,
      mustChangePassword: account.mustChangePassword,
    };
  }

  return {
    accessClaims,
    maySignIn,
    assertMaySignIn,
    lockAccount,

    /** A new USER with a password. A taken email is EMAIL_TAKEN. */
    async register({ name, email, password, language }: RegisterRequest): Promise<Account> {
      const passwordHash = await passwords.hash(password);
      const created = await repository.create({ name, email, passwordHash, language });
      if ('account' in created) return created.account;
      throw AppError.conflict('EMAIL_TAKEN', 'Email taken', { email: ['not_unique'] });
    },

    /**
     * The account these credentials open. Every mismatch is the same INVALID_CREDENTIALS: an unknown
     * email, a wrong password, or an account with no password (Google only). Only once the password
     * matches does a suspension show.
     */
    async verifyCredentials(email: string, password: string): Promise<VerifiedCredentials> {
      const found = await repository.findCredentials(email);
      const matched = found?.passwordHash ?? null;
      if (!(await passwords.verify(password, matched)) || !found) {
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
     * one already linked to it; else the account with its email, which is to be linked (`link`)
     * only where Google is authoritative for the address; else a new USER without a password.
     * Nothing here locks: the session is opened, and a link made, under the lock (`linkGoogle`).
     */
    async accountForGoogle(
      google: GoogleAccount,
      language: Language | undefined,
    ): Promise<{ userId: number; link: boolean }> {
      for (let attempt = 0; ; attempt++) {
        const known = await repository.findByGoogleSubject(google.subject);
        if (known) return { userId: known.id, link: false };

        const byEmail = await repository.findByEmail(google.email);
        if (byEmail) {
          if (byEmail.googleSubject) {
            // Linked to this identity: a racing first sign-in created it after the read above.
            if (byEmail.googleSubject === google.subject) {
              return { userId: byEmail.account.id, link: false };
            }
            // Another Google account is already linked to this email's account: never replaced.
            throw AppError.unauthorized('GOOGLE_TOKEN_INVALID', 'Linked to another Google account');
          }
          if (!googleIsAuthoritative(google)) {
            throw AppError.conflict(
              'GOOGLE_LINK_NOT_ALLOWED',
              'Google is not the address authority',
            );
          }
          return { userId: byEmail.account.id, link: true };
        }

        const parsedName = googleName.safeParse(google.name);
        const created = await repository.create({
          email: google.email,
          name: parsedName.success ? parsedName.data : (google.email.split('@')[0] ?? google.email),
          passwordHash: null,
          googleSubject: google.subject,
          language,
        });
        if ('account' in created) return { userId: created.account.id, link: false };
        // A concurrent first sign-in, or a registration, created it meanwhile: read it again, once.
        if (attempt > 0) throw AppError.conflict(undefined, 'Account created concurrently');
      }
    },

    /**
     * Links Google to the account, under its session lock: only where no Google account is linked
     * yet, removing the password and ending every session, because only Google proved the address.
     * The account, and whether this call linked it.
     */
    async linkGoogle(
      userId: number,
      google: GoogleAccount,
      tx: Tx,
    ): Promise<{ account: Account; linked: boolean }> {
      const locked = await lockAccount(userId, tx);
      if (!locked) throw AppError.unauthorized(undefined, 'Account not found');
      assertMaySignIn(locked);
      const linked = await repository.linkGoogleIfUnlinked(userId, google.subject, tx);
      if (!linked && (await repository.findGoogleSubject(userId, tx)) !== google.subject) {
        throw AppError.unauthorized('GOOGLE_TOKEN_INVALID', 'Linked to another Google account');
      }
      if (linked) await sessions.revokeAll(userId, tx);
      return { account: (await repository.findById(userId, tx)) ?? locked, linked };
    },

    get,

    /** The account with this email, if there is one. */
    async findByEmail(email: string, tx?: Tx): Promise<Account | null> {
      return (await repository.findByEmail(email, tx))?.account ?? null;
    },

    /** Hashes a new password, before the transaction that sets it opens. */
    hashPassword(password: string): Promise<string> {
      return passwords.hash(password);
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
     * required, except during the forced change, which both the access token's claim and the
     * account must still say is pending. An account without a password (Google only) sets its
     * first one through the reset email instead. Wrong current passwords count under a per-user
     * limit. Every session of the user ends, any pending reset link with them, and this device's
     * goes on in a new one.
     */
    async changePassword(
      userId: number,
      { currentPassword, password }: ChangePasswordRequest,
      { pendingChange }: { pendingChange: boolean },
    ): Promise<PasswordChange> {
      const account = await get(userId);
      assertMaySignIn(account);
      const currentHash = await repository.findPasswordHash(userId);
      if (!currentHash) {
        throw AppError.badRequest('PASSWORD_NOT_SET', 'Set a first password by the reset email');
      }
      const forced = pendingChange && account.mustChangePassword;
      if (!forced && currentPassword === undefined) {
        throw AppError.validation({ currentPassword: ['required'] });
      }

      return limiter.limitFailures(
        [{ policy: PASSWORD_CHANGE, by: [String(userId)] }],
        async () => {
          if (!forced && !(await passwords.verify(currentPassword ?? '', currentHash))) {
            throw AppError.badRequest('CURRENT_PASSWORD_INCORRECT', 'Current password incorrect');
          }

          const passwordHash = await passwords.hash(password);
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
            await sessions.endResetTokens(userId, tx);
            return { changed, issued: await sessions.issue(userId, tx) };
          });
          const accessToken = await accessTokens.sign(accessClaims(changed));
          return { accessToken, refreshToken: issued.token };
        },
      );
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
