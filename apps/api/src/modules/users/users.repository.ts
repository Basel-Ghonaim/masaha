import { prisma, type Tx } from '../../db/index.ts';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.ts';
import type { Language } from '../../generated/prisma/enums.ts';

// The account, without its password hash: the hash is selected only to check a password
// (docs/backend/security.md › Passwords).
const ACCOUNT = {
  id: true,
  email: true,
  name: true,
  role: true,
  language: true,
  mustChangePassword: true,
  suspendedAt: true,
} as const satisfies Prisma.UserSelect;

export type Account = Prisma.UserGetPayload<{ select: typeof ACCOUNT }>;

export interface NewAccount {
  email: string;
  name: string;
  passwordHash: string | null;
  googleSubject?: string;
  language?: Language;
}

/** A user's id and name, as another module lists them. */
export interface UserName {
  id: number;
  name: string;
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
        data: { googleSubject, passwordHash: null, mustChangePassword: false },
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
        data: { passwordHash, mustChangePassword: false },
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
        data: { passwordHash, mustChangePassword: false },
      });
      return count === 1 ? tx.user.findUnique({ where: { id }, select: ACCOUNT }) : null;
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
