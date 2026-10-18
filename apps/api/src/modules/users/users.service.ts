import { textSchema, type Language } from '@masaha/shared/core';
import {
  NAME_MAX_LENGTH,
  type ChangePasswordRequest,
  type HandoverChannel,
  type User,
} from '@masaha/shared/users';

import { createRunInTransaction, type RunInTransaction, type Tx } from '../../db/index.ts';
import type { Role } from '../../generated/prisma/enums.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import type { AccessClaims, AccessTokens, SignedInAccount } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { Limiter } from '../../shared/rate-limit/index.ts';
import { createSessionsService, type SessionsService } from '../sessions/index.ts';
import { hashPassword, verifyPassword } from './password.ts';
import {
  temporaryPassword,
  temporaryPasswordExpired,
  temporaryPasswordExpiry,
} from './temporaryPassword.ts';
import { PASSWORD_CHANGE } from './users.limits.ts';
import { toUserView } from './users.mapper.ts';
import {
  createUsersRepository,
  type Account,
  type AccountsFilter,
  type ListedAccount,
  type StaffAccount,
  type UserName,
  type UsersRepository,
} from './users.repository.ts';

/** An account as the admin's users list shows it, with how it signs in. */
export type AccountListing = Omit<ListedAccount, 'googleSubject'> & {
  hasPassword: boolean;
  hasGoogle: boolean;
};

interface Dependencies {
  accessTokens: AccessTokens;
  limiter: Limiter;
  audit: AuditWriter;
  /** The one clock (conventions §11): suspensions, and temporary passwords' expiry. */
  now: () => Date;
  repository?: UsersRepository;
  sessions?: SessionsService;
  runInTransaction?: RunInTransaction;
}

/** A person Google has verified (the auth module's Google port). */
export interface GoogleAccount {
  subject: string;
  email: string;
  name: string | undefined;
  hostedDomain: string | undefined;
}

/** A registration: a new account with a password. */
export interface Registration {
  name: string;
  email: string;
  password: string;
  language?: Language;
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

/** A temporary password, shown once to hand over, and its hash, to store. */
export interface TemporaryPassword {
  password: string;
  hash: string;
}

/** An account someone else creates, with a temporary password. */
export interface CreatedAccount {
  name: string;
  email: string;
  role: Role;
}

/** An account locked with every active admin's row: what a change that may remove an admin reads. */
export interface LockedAmongAdmins {
  account: Account;
  /** The active admins other than this account, counted under the lock. */
  otherActiveAdmins: number;
}

/** An admin acts on another person's account only (D2): never suspends or demotes themselves. */
export function assertNotOwnAccount(actorId: number, userId: number): void {
  if (actorId === userId) throw AppError.conflict('OWN_ACCOUNT', 'Not on one’s own account');
}

/** The platform keeps an active admin (D2): a change may not remove the last one. */
export function assertKeepsAnAdmin({ account, otherActiveAdmins }: LockedAmongAdmins): void {
  if (account.role === 'ADMIN' && !account.suspendedAt && otherActiveAdmins === 0) {
    throw AppError.conflict('LAST_ADMIN', 'The last active admin');
  }
}

/**
 * An account whose temporary password is pending gains no power (S6): its password is known to
 * whoever created the account, so an owner's link, or the admin's role, would be theirs too
 * (docs/backend/security.md › Passwords). The person changes it first.
 */
export function assertNoPasswordPending(account: Account): void {
  if (account.mustChangePassword) {
    throw AppError.conflict('ACCOUNT_PASSWORD_PENDING', 'A temporary password is pending');
  }
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
  audit,
  now,
  repository = createUsersRepository(),
  sessions = createSessionsService(),
  runInTransaction = createRunInTransaction(),
}: Dependencies) {
  /** A suspended account cannot sign in or refresh (docs/backend/security.md). */
  function maySignIn(account: Account): boolean {
    return !account.suspendedAt;
  }

  /**
   * Whether the reset email may open the account: one that may sign in, with no temporary password
   * pending (accounts created by someone else, docs/backend/security.md › Passwords).
   */
  function mayRecoverByEmail(account: Account): boolean {
    return maySignIn(account) && !account.mustChangePassword;
  }

  /**
   * No Google link while a temporary password is pending: its email was typed by someone else, so
   * Google proving the address proves nothing of the person (docs/backend/security.md › Sign-in methods).
   */
  function assertMayLinkGoogle(account: Account): void {
    if (account.mustChangePassword) {
      throw AppError.conflict('GOOGLE_LINK_NOT_ALLOWED', 'A temporary password is pending');
    }
  }

  function assertMaySignIn(account: Account): void {
    if (!maySignIn(account)) throw AppError.forbidden('ACCOUNT_SUSPENDED', 'Account suspended');
  }

  /**
   * A password sign-in with a temporary password past its expiry is refused (docs/backend/security.md
   * › Passwords): only once the password matched, so only its holder learns it expired.
   */
  function assertTemporaryPasswordLive(account: Account): void {
    if (temporaryPasswordExpired(account, now())) {
      throw AppError.forbidden('TEMPORARY_PASSWORD_EXPIRED', 'Temporary password expired');
    }
  }

  /**
   * Takes the user's session lock, and reads the account under it (conventions §13). Every
   * transaction that writes the user's refresh tokens takes it first, so a revocation and a new
   * session never interleave. Nothing when the account no longer exists.
   */
  async function lockAccount(id: number, tx: Tx): Promise<Account | null> {
    return (await repository.lock(id, tx)) ? repository.findById(id, tx) : null;
  }

  /**
   * Takes the user's session lock with every active admin's row, by id, in one statement
   * (conventions §13), and reads the account under it. A change that may remove an admin takes it,
   * so two admins acting on each other at once count each other's change. Nothing when the account
   * does not exist.
   */
  async function lockForAdminChange(id: number, tx: Tx): Promise<LockedAmongAdmins | null> {
    const locked = await repository.lockWithActiveAdmins(id, tx);
    if (!locked.includes(id)) return null;
    const account = await repository.findById(id, tx);
    if (!account) return null;
    return { account, otherActiveAdmins: locked.filter((other) => other !== id).length };
  }

  /**
   * A new temporary password and its hash (docs/backend/security.md › Passwords), before the
   * transaction that stores it opens: bcrypt stays outside every transaction.
   */
  async function issueTemporaryPassword(): Promise<TemporaryPassword> {
    const password = temporaryPassword();
    return { password, hash: await hashPassword(password) };
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
      mustChangePassword: account.mustChangePassword,
      sessionVersion: account.sessionVersion,
    };
  }

  /**
   * Ends every session of the user (docs/backend/security.md › Tokens and cookies): their refresh
   * tokens are deleted, and their session version goes up, so every access token already signed is
   * refused from its next request. In the caller's transaction, under the session lock it took
   * (conventions §13). The one way to end every session: nothing else revokes them.
   */
  async function endSessions(userId: number, tx: Tx): Promise<void> {
    await repository.bumpSessionVersion(userId, tx);
    await sessions.revokeAll(userId, tx);
  }

  /**
   * Replaces the account's password with a temporary one already hashed, expiring 7 days from now,
   * under the session lock its caller took: every session and pending reset link ends, as a reset
   * does, and the issue is audited `user.temporaryPasswordIssued`, with the space when an owner
   * issues it. The admin's recovery and the owner's re-issue both write through here.
   */
  async function replaceWithTemporaryPassword(
    actorId: number,
    userId: number,
    passwordHash: string,
    tx: Tx,
    spaceId?: number,
  ): Promise<void> {
    await repository.setTemporaryPassword(userId, passwordHash, temporaryPasswordExpiry(now()), tx);
    await endSessions(userId, tx);
    await sessions.endResetTokens(userId, tx);
    await audit(
      {
        actorId,
        action: 'user.temporaryPasswordIssued',
        entityType: 'user',
        entityId: userId,
        ...(spaceId !== undefined && { spaceId }),
        after: { mustChangePassword: true },
      },
      tx,
    );
  }

  /**
   * The account's handover, under its session lock, which the caller took (with `lockAccount`).
   * Only while its temporary password is pending. `spaceId` names the space for an owner's staff.
   */
  async function recordHandoverLocked(
    actorId: number,
    account: Account,
    channel: HandoverChannel,
    tx: Tx,
    spaceId?: number,
  ): Promise<void> {
    if (!account.mustChangePassword) {
      throw AppError.conflict('TEMPORARY_PASSWORD_NOT_PENDING', 'No temporary password pending');
    }
    await audit(
      {
        actorId,
        action: 'user.temporaryPasswordHandedOver',
        entityType: 'user',
        entityId: account.id,
        ...(spaceId !== undefined && { spaceId }),
        after: { channel },
      },
      tx,
    );
  }

  return {
    accessClaims,
    endSessions,

    /**
     * The account as requireAuth reads it on every signed-in request, by its primary key (ADR 0003,
     * revised): its role, its pending change and its suspension now. Nothing when there is none.
     */
    async signedInAccount(id: number): Promise<SignedInAccount | null> {
      const account = await repository.findById(id);
      if (!account) return null;
      const { role, mustChangePassword, sessionVersion } = account;
      return { role, mustChangePassword, sessionVersion, suspended: !maySignIn(account) };
    },
    maySignIn,
    mayRecoverByEmail,
    assertMaySignIn,
    lockAccount,
    lockForAdminChange,

    /** A new USER with a password. A taken email is EMAIL_TAKEN. */
    async register({ name, email, password, language }: Registration): Promise<Account> {
      const passwordHash = await hashPassword(password);
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
      if (!(await verifyPassword(password, matched)) || !found) {
        throw AppError.unauthorized('INVALID_CREDENTIALS', 'Invalid credentials');
      }
      assertMaySignIn(found.account);
      assertTemporaryPasswordLive(found.account);
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
          assertTemporaryPasswordLive(locked);
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
          assertMayLinkGoogle(byEmail.account);
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
      // A temporary password issued since the read: refused under the lock, before anything links.
      assertMayLinkGoogle(locked);
      const linked = await repository.linkGoogleIfUnlinked(userId, google.subject, tx);
      if (!linked && (await repository.findGoogleSubject(userId, tx)) !== google.subject) {
        throw AppError.unauthorized('GOOGLE_TOKEN_INVALID', 'Linked to another Google account');
      }
      if (linked) await endSessions(userId, tx);
      return { account: (await repository.findById(userId, tx)) ?? locked, linked };
    },

    get,

    /**
     * Changes the account's global role, under its session lock, which the caller took: with
     * `lockAccount`, or with `lockForAdminChange`, which also holds every active admin's row, when
     * the change may remove an admin. Every session of the user ends, so no session goes on with
     * the old role (docs/backend/security.md › Tokens and cookies), and the change is audited.
     */
    async changeRole(account: Account, role: Role, actorId: number, tx: Tx): Promise<void> {
      await repository.setRole(account.id, role, tx);
      await endSessions(account.id, tx);
      await audit(
        {
          actorId,
          action: 'user.roleChanged',
          entityType: 'user',
          entityId: account.id,
          before: { role: account.role },
          after: { role },
        },
        tx,
      );
    },

    /**
     * One page of the accounts the filter keeps, newest first, each with how it signs in, for the
     * admin's users list; the total counts every account the filter keeps (conventions §5).
     */
    async page(
      filter: AccountsFilter,
      { page, limit }: { page: number; limit: number },
    ): Promise<{ rows: AccountListing[]; total: number }> {
      const { rows, total } = await repository.findPage(filter, {
        skip: (page - 1) * limit,
        take: limit,
      });
      const withPassword = new Set(
        rows.length === 0 ? [] : await repository.findWithPassword(rows.map(({ id }) => id)),
      );
      return {
        rows: rows.map(({ googleSubject, ...account }) => ({
          ...account,
          hasPassword: withPassword.has(account.id),
          hasGoogle: googleSubject !== null,
        })),
        total,
      };
    },

    /** The names of these users, in one query, for a list that names them (the spaces' owners). */
    namesFor(ids: readonly number[], tx?: Tx): Promise<UserName[]> {
      return repository.findNames(ids, tx);
    },

    /** These users' accounts as the owner's staff list shows them, in one query. */
    staffAccounts(ids: readonly number[], tx?: Tx): Promise<StaffAccount[]> {
      return repository.findStaffAccounts(ids, tx);
    },

    /** The account with this email, if there is one. */
    async findByEmail(email: string, tx?: Tx): Promise<Account | null> {
      return (await repository.findByEmail(email, tx))?.account ?? null;
    },

    issueTemporaryPassword,

    /**
     * An account created by someone else, with a temporary password to change at its first
     * sign-in, audited `user.created`; the password is in no entry. Nothing when the email already
     * has an account, which then ends the caller's transaction.
     */
    async createWithTemporaryPassword(
      { name, email, role }: CreatedAccount,
      passwordHash: string,
      actorId: number,
      tx: Tx,
    ): Promise<Account | null> {
      const created = await repository.create(
        {
          name,
          email,
          passwordHash,
          role,
          mustChangePassword: true,
          temporaryPasswordExpiresAt: temporaryPasswordExpiry(now()),
        },
        tx,
      );
      if (!('account' in created)) return null;
      await audit(
        {
          actorId,
          action: 'user.created',
          entityType: 'user',
          entityId: created.account.id,
          after: { name, email, role, mustChangePassword: true },
        },
        tx,
      );
      return created.account;
    },

    /**
     * The admin's recovery for a person who lost their email (D6, docs/backend/security.md ›
     * Passwords): a temporary password, generated and hashed before the transaction, set under the
     * account's session lock, to be changed at the next sign-in. Every session and pending reset link
     * ends, as a reset does; issued again, it replaces the pending one. Refused for the actor's own
     * account, a suspended one (restored first) and a Google-only one, which has no password to
     * recover. Audited `user.temporaryPasswordIssued`, never with the password, which is answered
     * once; an unknown account is 404.
     */
    async issueTemporaryPasswordFor(actorId: number, userId: number): Promise<string> {
      assertNotOwnAccount(actorId, userId);
      const temporary = await issueTemporaryPassword();
      await runInTransaction(async (tx) => {
        const account = await lockAccount(userId, tx);
        if (!account) throw AppError.notFound(undefined, 'Account not found');
        if (!maySignIn(account)) throw AppError.conflict('ACCOUNT_SUSPENDED', 'Account suspended');
        if (!(await repository.findPasswordHash(userId, tx))) {
          throw AppError.conflict('GOOGLE_ONLY_ACCOUNT', 'No password to replace');
        }
        await replaceWithTemporaryPassword(actorId, userId, temporary.hash, tx);
      });
      return temporary.password;
    },

    replaceWithTemporaryPassword,
    recordHandoverLocked,

    /**
     * Records how the account's temporary password was handed over, after it was shown (the
     * owner's A5): audited `user.temporaryPasswordHandedOver`, the account as the entity, as the
     * entry of the password it follows. Only while that password is still pending; an unknown
     * account is 404.
     */
    recordHandover(actorId: number, userId: number, channel: HandoverChannel): Promise<void> {
      return runInTransaction(async (tx) => {
        const account = await lockAccount(userId, tx);
        if (!account) throw AppError.notFound(undefined, 'Account not found');
        await recordHandoverLocked(actorId, account, channel, tx);
      });
    },

    /**
     * Suspends the account, or restores it (D1, D4), under the admin-set lock: never the actor's own,
     * never the last active admin. A suspension ends every session and pending reset link; the links
     * to spaces stay. The same state again writes nothing. Audited `user.suspended` or
     * `user.unsuspended`; an unknown account is 404.
     */
    async setSuspended(actorId: number, userId: number, isSuspended: boolean): Promise<void> {
      assertNotOwnAccount(actorId, userId);
      await runInTransaction(async (tx) => {
        const locked = await lockForAdminChange(userId, tx);
        if (!locked) throw AppError.notFound(undefined, 'Account not found');
        if (!maySignIn(locked.account) === isSuspended) return;
        if (isSuspended) assertKeepsAnAdmin(locked);
        await repository.setSuspendedAt(userId, isSuspended ? now() : null, tx);
        if (isSuspended) {
          await endSessions(userId, tx);
          await sessions.endResetTokens(userId, tx);
        }
        await audit(
          {
            actorId,
            action: isSuspended ? 'user.suspended' : 'user.unsuspended',
            entityType: 'user',
            entityId: userId,
            before: { isSuspended: !isSuspended },
            after: { isSuspended },
          },
          tx,
        );
      });
    },

    /** Hashes a new password, before the transaction that sets it opens. */
    hashPassword(password: string): Promise<string> {
      return hashPassword(password);
    },

    /** Sets a password already hashed, settling a pending temporary one. */
    async setPassword(userId: number, passwordHash: string, tx?: Tx): Promise<void> {
      await repository.setPassword(userId, passwordHash, tx);
    },

    async view(account: Account, tx?: Tx): Promise<User> {
      return toUserView(account, await repository.hasPassword(account.id, tx));
    },

    /**
     * Sets the user's password (docs/backend/security.md › Passwords). The current password is
     * required, except during the forced change, which both the access token's claim and the
     * account must still say is pending. An account without a password (Google only) sets its
     * first one through the reset email instead. Wrong current passwords count under a per-user
     * limit. Every session of the user ends, any pending reset link with them, and this device's
     * goes on in a new one. The forced change also takes the email, confirmed or corrected (its
     * address was typed by someone else): a correction is audited, and a taken one changes nothing.
     */
    async changePassword(
      userId: number,
      { currentPassword, password, email }: ChangePasswordRequest,
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
      // Outside the forced change the address is not this route's: refused, never dropped.
      if (!forced && email !== undefined) throw AppError.validation({ email: ['invalid_choice'] });

      return limiter.limitFailures(
        [{ policy: PASSWORD_CHANGE, by: [String(userId)] }],
        async () => {
          if (!forced && !(await verifyPassword(currentPassword ?? '', currentHash))) {
            throw AppError.badRequest('CURRENT_PASSWORD_INCORRECT', 'Current password incorrect');
          }

          const passwordHash = await hashPassword(password);
          const expected = {
            passwordHash: currentHash,
            mustChangePassword: account.mustChangePassword,
          };
          const { changed, issued } = await runInTransaction(async (tx) => {
            // The session lock first, so a suspension that committed meanwhile is seen and no
            // session opens for it; the update applies only to the password that was checked.
            const locked = await lockAccount(userId, tx);
            if (!locked) throw AppError.unauthorized(undefined, 'Account not found');
            assertMaySignIn(locked);
            if (!(await repository.setPasswordIf(userId, passwordHash, expected, tx))) {
              throw AppError.badRequest('CURRENT_PASSWORD_INCORRECT', 'Password changed meanwhile');
            }
            if (email !== undefined && email !== locked.email) {
              // The last statement before the throw: a unique violation aborts the transaction.
              if ((await repository.setEmail(userId, email, tx)) === 'taken') {
                throw AppError.conflict('EMAIL_TAKEN', 'Email taken', { email: ['not_unique'] });
              }
              await audit(
                {
                  actorId: userId,
                  action: 'user.emailChanged',
                  entityType: 'user',
                  entityId: userId,
                  before: { email: locked.email },
                  after: { email },
                },
                tx,
              );
            }
            await endSessions(userId, tx);
            await sessions.endResetTokens(userId, tx);
            // Read after the version went up: this device's new token is signed under it.
            return { changed: await get(userId, tx), issued: await sessions.issue(userId, tx) };
          });
          const accessToken = await accessTokens.sign(accessClaims(changed));
          return { accessToken, refreshToken: issued.token };
        },
      );
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
