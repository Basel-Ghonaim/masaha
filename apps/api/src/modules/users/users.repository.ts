import { prisma, type Tx } from '../../db/index.ts';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.ts';
import type { Language, Role } from '../../generated/prisma/enums.ts';

// The account, without its password hash: the hash is selected only to check a password
// (docs/backend/security.md › Passwords).
const ACCOUNT = {
  id: true,
  email: true,
  name: true,
  role: true,
  language: true,
  mustChangePassword: true,
  temporaryPasswordExpiresAt: true,
  suspendedAt: true,
  sessionVersion: true,
} as const satisfies Prisma.UserSelect;

export type Account = Prisma.UserGetPayload<{ select: typeof ACCOUNT }>;

export interface NewAccount {
  email: string;
  name: string;
  passwordHash: string | null;
  googleSubject?: string;
  language?: Language;
  role?: Role;
  /** A temporary password, set by someone else, to be changed first. */
  mustChangePassword?: boolean;
  /** When that temporary password expires: given with it, and only with it. */
  temporaryPasswordExpiresAt?: Date;
}

/** A user's id and name, as another module lists them. */
export interface UserName {
  id: number;
  name: string;
}

/** A staff member's account, as the owner's staff list shows it. */
export interface StaffAccount {
  id: number;
  name: string;
  email: string;
  mustChangePassword: boolean;
  temporaryPasswordExpiresAt: Date | null;
}

/** What the admin's list filters the accounts by, each optional. */
export interface AccountsFilter {
  /** Part of the name or the email, whatever the case. */
  q?: string;
  role?: Role;
  suspended?: boolean;
}

// An account as the admin's list shows it: still never its password hash.
const LISTED = {
  id: true,
  name: true,
  email: true,
  role: true,
  suspendedAt: true,
  createdAt: true,
  googleSubject: true,
} as const satisfies Prisma.UserSelect;

export type ListedAccount = Prisma.UserGetPayload<{ select: typeof LISTED }>;

function accountsWhere({ q, role, suspended }: AccountsFilter): Prisma.UserWhereInput {
  return {
    ...(q !== undefined && {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    }),
    ...(role && { role }),
    ...(suspended !== undefined && { suspendedAt: suspended ? { not: null } : null }),
  };
}

export function createUsersRepository(db: PrismaClient = prisma) {
  return {
    findById(id: number, tx: Tx = db): Promise<Account | null> {
      return tx.user.findUnique({ where: { id }, select: ACCOUNT });
    },

    /** The names of these users, in one query. */
    findNames(ids: readonly number[], tx: Tx = db): Promise<UserName[]> {
      return tx.user.findMany({
        where: { id: { in: [...ids] } },
        select: { id: true, name: true },
      });
    },

    /** These users' accounts as a staff list shows them, in one query, without any hash. */
    findStaffAccounts(ids: readonly number[], tx: Tx = db): Promise<StaffAccount[]> {
      return tx.user.findMany({
        where: { id: { in: [...ids] } },
        select: {
          id: true,
          name: true,
          email: true,
          mustChangePassword: true,
          temporaryPasswordExpiresAt: true,
        },
      });
    },

    /** One page of the accounts the filter keeps, newest first, and how many it keeps in all. */
    async findPage(
      filter: AccountsFilter,
      { skip, take }: { skip: number; take: number },
    ): Promise<{ rows: ListedAccount[]; total: number }> {
      const where = accountsWhere(filter);
      const [rows, total] = await Promise.all([
        db.user.findMany({
          where,
          select: LISTED,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip,
          take,
        }),
        db.user.count({ where }),
      ]);
      return { rows, total };
    },

    /** Which of these users have a password, without reading any hash. */
    async findWithPassword(ids: readonly number[]): Promise<number[]> {
      const rows = await db.user.findMany({
        where: { id: { in: [...ids] }, passwordHash: { not: null } },
        select: { id: true },
      });
      return rows.map(({ id }) => id);
    },

    /** The account and its hash apart, for a password check only. */
    async findCredentials(
      email: string,
      tx: Tx = db,
    ): Promise<{ account: Account; passwordHash: string | null } | null> {
      const row = await tx.user.findUnique({
        where: { email },
        select: { ...ACCOUNT, passwordHash: true },
      });
      if (!row) return null;
      const { passwordHash, ...account } = row;
      return { account, passwordHash };
    },

    findByGoogleSubject(googleSubject: string, tx: Tx = db): Promise<Account | null> {
      return tx.user.findUnique({ where: { googleSubject }, select: ACCOUNT });
    },

    /** The account with this email, and the Google account linked to it, if any. */
    async findByEmail(
      email: string,
      tx: Tx = db,
    ): Promise<{ account: Account; googleSubject: string | null } | null> {
      const row = await tx.user.findUnique({
        where: { email },
        select: { ...ACCOUNT, googleSubject: true },
      });
      if (!row) return null;
      const { googleSubject, ...account } = row;
      return { account, googleSubject };
    },

    /**
     * Links the Google account where none is linked yet, and removes the password: Google alone
     * proved the address. Whether this call linked it.
     */
    async linkGoogleIfUnlinked(id: number, googleSubject: string, tx: Tx = db): Promise<boolean> {
      const { count } = await tx.user.updateMany({
        where: { id, googleSubject: null },
        data: {
          googleSubject,
          passwordHash: null,
          mustChangePassword: false,
          temporaryPasswordExpiresAt: null,
        },
      });
      return count === 1;
    },

    async findGoogleSubject(id: number, tx: Tx = db): Promise<string | null> {
      const row = await tx.user.findUnique({ where: { id }, select: { googleSubject: true } });
      return row?.googleSubject ?? null;
    },

    /** The account's hash, for a password check only. */
    async findPasswordHash(id: number, tx: Tx = db): Promise<string | null> {
      const row = await tx.user.findUnique({ where: { id }, select: { passwordHash: true } });
      return row?.passwordHash ?? null;
    },

    /** Sets the password, which also settles a pending temporary one. */
    async setPassword(id: number, passwordHash: string, tx: Tx = db): Promise<Account> {
      return tx.user.update({
        where: { id },
        data: { passwordHash, mustChangePassword: false, temporaryPasswordExpiresAt: null },
        select: ACCOUNT,
      });
    },

    /**
     * Locks the user's row until the transaction ends (conventions §13): the session lock. `FOR NO
     * KEY UPDATE` waits for another session writer, and lets inserts that only reference the user
     * (payments, audit entries) through. Whether the user exists.
     */
    async lock(id: number, tx: Tx): Promise<boolean> {
      const rows = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM users WHERE id = ${id} FOR NO KEY UPDATE`;
      return rows.length === 1;
    },

    /**
     * Locks the user's row and every active admin's, in one statement, by id (conventions §13): the
     * session lock, with the rows a change that may remove an admin counts. Under read committed, a
     * row that a change committed meanwhile made no longer an active admin drops out of the set when
     * its lock is granted. The ids locked, the user's among them when it exists.
     */
    async lockWithActiveAdmins(id: number, tx: Tx): Promise<number[]> {
      const rows = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM users
        WHERE id = ${id} OR (role = 'ADMIN' AND suspended_at IS NULL)
        ORDER BY id
        FOR NO KEY UPDATE`;
      return rows.map((row) => row.id);
    },

    /** Replaces the password with a temporary one, which must be changed first, before it expires. */
    async setTemporaryPassword(
      id: number,
      passwordHash: string,
      expiresAt: Date,
      tx: Tx,
    ): Promise<void> {
      await tx.user.update({
        where: { id },
        data: { passwordHash, mustChangePassword: true, temporaryPasswordExpiresAt: expiresAt },
        select: { id: true },
      });
    },

    /**
     * Sets the account's email, or says another account holds it. A unique violation aborts the
     * transaction: the caller throws at once, and the change rolls back whole.
     */
    async setEmail(id: number, email: string, tx: Tx): Promise<'set' | 'taken'> {
      try {
        await tx.user.update({ where: { id }, data: { email }, select: { id: true } });
        return 'set';
      } catch (error) {
        if (takenKey(error) === 'email') return 'taken';
        throw error;
      }
    },

    /** Suspends the account at `at`, or restores it with `null`. */
    async setSuspendedAt(id: number, at: Date | null, tx: Tx): Promise<void> {
      await tx.user.update({ where: { id }, data: { suspendedAt: at }, select: { id: true } });
    },

    /**
     * Sets the password only if the account still has the hash and the pending flag it was checked
     * against: a compare-and-set, so a reset that landed meanwhile is never overwritten. The account
     * after the change, or nothing when it had changed.
     */
    async setPasswordIf(
      id: number,
      passwordHash: string,
      expected: { passwordHash: string | null; mustChangePassword: boolean },
      tx: Tx = db,
    ): Promise<Account | null> {
      const { count } = await tx.user.updateMany({
        where: { id, ...expected },
        data: { passwordHash, mustChangePassword: false, temporaryPasswordExpiresAt: null },
      });
      return count === 1 ? tx.user.findUnique({ where: { id }, select: ACCOUNT }) : null;
    },

    /**
     * One more on the account's session version, in one atomic statement: every access token signed
     * under the version before is refused from its next request.
     */
    async bumpSessionVersion(id: number, tx: Tx): Promise<void> {
      await tx.user.update({
        where: { id },
        data: { sessionVersion: { increment: 1 } },
        select: { id: true },
      });
    },

    /** Sets the global role. */
    async setRole(id: number, role: Role, tx: Tx): Promise<void> {
      await tx.user.update({ where: { id }, data: { role }, select: { id: true } });
    },

    async hasPassword(id: number, tx: Tx = db): Promise<boolean> {
      return (await tx.user.count({ where: { id, passwordHash: { not: null } } })) === 1;
    },

    /** A new account, or which unique key another account already holds. */
    async create(
      account: NewAccount,
      tx: Tx = db,
    ): Promise<{ account: Account } | { taken: 'email' | 'googleSubject' }> {
      try {
        return { account: await tx.user.create({ data: account, select: ACCOUNT }) };
      } catch (error) {
        const taken = takenKey(error);
        if (taken) return { taken };
        throw error;
      }
    },
  };
}

/** Which of the users' unique keys a unique violation is about, by its constraint's name. */
function takenKey(error: unknown): 'email' | 'googleSubject' | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return undefined;
  }
  const detail = JSON.stringify(error.meta ?? {});
  if (detail.includes('users_email_key')) return 'email';
  if (detail.includes('users_google_subject_key')) return 'googleSubject';
  return undefined;
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;
