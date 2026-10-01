import { prisma, type Tx } from '../../db/index.ts';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.ts';
import type { Language } from '../../generated/prisma/enums.ts';
import { AppError } from '../../shared/errors/index.ts';

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

export function createUsersRepository(db: PrismaClient = prisma) {
  return {
    findById(id: number, tx: Tx = db): Promise<Account | null> {
      return tx.user.findUnique({ where: { id }, select: ACCOUNT });
    },

    /** The account and its hash apart, for a password check only. */
    async findCredentials(
      email: string,
    ): Promise<{ account: Account; passwordHash: string | null } | null> {
      const row = await db.user.findUnique({
        where: { email },
        select: { ...ACCOUNT, passwordHash: true },
      });
      if (!row) return null;
      const { passwordHash, ...account } = row;
      return { account, passwordHash };
    },

    findByGoogleSubject(googleSubject: string): Promise<Account | null> {
      return db.user.findUnique({ where: { googleSubject }, select: ACCOUNT });
    },

    /** The account with this email, and the Google account linked to it, if any. */
    async findByEmail(
      email: string,
    ): Promise<{ account: Account; googleSubject: string | null } | null> {
      const row = await db.user.findUnique({
        where: { email },
        select: { ...ACCOUNT, googleSubject: true },
      });
      if (!row) return null;
      const { googleSubject, ...account } = row;
      return { account, googleSubject };
    },

    async linkGoogle(id: number, googleSubject: string): Promise<Account> {
      return db.user.update({ where: { id }, data: { googleSubject }, select: ACCOUNT });
    },

    /** The account's hash, for a password check only. */
    async findPasswordHash(id: number): Promise<string | null> {
      const row = await db.user.findUnique({ where: { id }, select: { passwordHash: true } });
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

    async hasPassword(id: number, tx: Tx = db): Promise<boolean> {
      return (await tx.user.count({ where: { id, passwordHash: { not: null } } })) === 1;
    },

    async create(account: NewAccount, tx: Tx = db): Promise<Account> {
      try {
        return await tx.user.create({ data: account, select: ACCOUNT });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw AppError.conflict('EMAIL_TAKEN', 'Email taken', { email: ['not_unique'] });
        }
        throw error;
      }
    },
  };
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;
