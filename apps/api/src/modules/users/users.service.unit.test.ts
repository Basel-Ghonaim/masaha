import { describe, expect, it } from 'vitest';

import type { RunInTransaction, Tx } from '../../db/index.ts';
import type { AccessTokens } from '../../shared/auth/index.ts';
import type { AppError } from '../../shared/errors/index.ts';
import { createLimiter, type Counter } from '../../shared/rate-limit/index.ts';
import type { SessionsService } from '../sessions/index.ts';
import type { Account, UsersRepository } from './users.repository.ts';
import {
  createUsersService,
  googleIsAuthoritative,
  type GoogleAccount,
  type Passwords,
} from './users.service.ts';

const tx = {} as Tx;
const sara: Account = {
  id: 3,
  email: 'sara@gmail.com',
  name: 'Sara',
  role: 'USER',
  language: 'ar',
  mustChangePassword: false,
  suspendedAt: null,
};
const google: GoogleAccount = {
  subject: 'g-sara',
  email: 'sara@gmail.com',
  name: 'Sara',
  hostedDomain: undefined,
};

/** A users service over fakes, with a record of what it asked of them. */
function setup(repository: Partial<Record<keyof UsersRepository, unknown>> = {}) {
  const calls: string[] = [];
  const passwords: Passwords = {
    hash: (password) => Promise.resolve(`hash:${password}`),
    verify: (password, hash) => {
      calls.push(`verify:${hash ?? 'none'}`);
      return Promise.resolve(hash === `hash:${password}`);
    },
  };
  const sessions = {
    revokeAll: () => {
      calls.push('revokeAll');
      return Promise.resolve();
    },
    endResetTokens: () => Promise.resolve(),
    issue: () => Promise.resolve({ token: 'refresh' }),
  } as unknown as SessionsService;
  const counter: Counter = {
    hit: () => Promise.resolve({ hits: 1, resetAt: new Date(Date.now() + 60_000) }),
    refund: () => Promise.resolve(),
  };
  const runInTransaction: RunInTransaction = (work) => work(tx);
  const users = createUsersService({
    accessTokens: { sign: () => Promise.resolve('access') } as unknown as AccessTokens,
    limiter: createLimiter(counter, () => new Date()),
    repository: {
      lock: () => Promise.resolve(true),
      findById: () => Promise.resolve(sara),
      ...repository,
    } as unknown as UsersRepository,
    sessions,
    runInTransaction,
    passwords,
  });
  return { calls, users };
}

async function rejection(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    return error as AppError;
  }
  throw new Error('Expected a rejection');
}

describe('users: credentials', () => {
  it('spends a comparison on an unknown email, and answers as for a wrong password', async () => {
    const { calls, users } = setup({ findCredentials: () => Promise.resolve(null) });

    const error = await rejection(users.verifyCredentials('nobody@example.com', 'gaza2026'));

    expect(calls).toEqual(['verify:none']);
    expect(error.code).toBe('INVALID_CREDENTIALS');
  });

  it('shows a suspension only once the password matches', async () => {
    const suspended = { ...sara, suspendedAt: new Date() };
    const { users } = setup({
      findCredentials: () => Promise.resolve({ account: suspended, passwordHash: 'hash:right' }),
    });

    expect((await rejection(users.verifyCredentials(sara.email, 'wrong'))).code).toBe(
      'INVALID_CREDENTIALS',
    );
    expect((await rejection(users.verifyCredentials(sara.email, 'right'))).code).toBe(
      'ACCOUNT_SUSPENDED',
    );
  });

  it('confirms under the lock only while the matched hash is still the account’s', async () => {
    let stored = 'hash:right';
    const { users } = setup({
      findCredentials: () => Promise.resolve({ account: sara, passwordHash: stored }),
      findPasswordHash: () => Promise.resolve(stored),
    });
    const verified = await users.verifyCredentials(sara.email, 'right');

    expect(await verified.confirm(tx)).toEqual(sara);
    stored = 'hash:reset';
    expect((await rejection(verified.confirm(tx))).code).toBe('INVALID_CREDENTIALS');
  });
});

describe('users: Google', () => {
  it.each([
    ['a Gmail address', { email: 'a@gmail.com', hostedDomain: undefined }, true],
    ['an address of the hd domain', { email: 'a@masaha.ps', hostedDomain: 'masaha.ps' }, true],
    ['an address outside the hd domain', { email: 'a@other.ps', hostedDomain: 'masaha.ps' }, false],
    ['any other address', { email: 'a@example.com', hostedDomain: undefined }, false],
  ])('trusts Google for %s: %s', (_case, account, expected) => {
    expect(googleIsAuthoritative({ ...google, ...account })).toBe(expected);
  });

  it('opens the account already linked to the Google subject', async () => {
    const { users } = setup({ findByGoogleSubject: () => Promise.resolve(sara) });

    expect(await users.accountForGoogle(google, undefined)).toEqual({ userId: 3, link: false });
  });

  it('links an authoritative address, refuses another, and never replaces another subject', async () => {
    const found = (googleSubject: string | null) =>
      setup({
        findByGoogleSubject: () => Promise.resolve(null),
        findByEmail: () => Promise.resolve({ account: sara, googleSubject }),
      }).users;

    expect(await found(null).accountForGoogle(google, undefined)).toEqual({
      userId: 3,
      link: true,
    });
    expect(
      (
        await rejection(
          found(null).accountForGoogle({ ...google, email: 'sara@example.com' }, undefined),
        )
      ).code,
    ).toBe('GOOGLE_LINK_NOT_ALLOWED');
    expect((await rejection(found('g-other').accountForGoogle(google, undefined))).code).toBe(
      'GOOGLE_TOKEN_INVALID',
    );
  });

  it('opens the account a racing first sign-in of the same subject just created', async () => {
    let created = false;
    const { users } = setup({
      findByGoogleSubject: () => Promise.resolve(null),
      findByEmail: () => Promise.resolve({ account: sara, googleSubject: google.subject }),
      create: () => {
        created = true;
        return Promise.resolve({ account: sara });
      },
    });

    expect(await users.accountForGoogle(google, undefined)).toEqual({ userId: 3, link: false });
    expect(created).toBe(false);
  });

  it('creates a USER, and reads it again when a racing sign-in created it first', async () => {
    let created = false;
    const { users } = setup({
      findByGoogleSubject: () => Promise.resolve(created ? sara : null),
      findByEmail: () => Promise.resolve(null),
      create: () => {
        created = true;
        return Promise.resolve({ taken: 'googleSubject' });
      },
    });

    expect(await users.accountForGoogle(google, 'en')).toEqual({ userId: 3, link: false });
  });

  it('ends every session when it links, and none when the link was already made', async () => {
    const linking = setup({ linkGoogleIfUnlinked: () => Promise.resolve(true) });
    const linked = setup({
      linkGoogleIfUnlinked: () => Promise.resolve(false),
      findGoogleSubject: () => Promise.resolve('g-sara'),
    });
    const other = setup({
      linkGoogleIfUnlinked: () => Promise.resolve(false),
      findGoogleSubject: () => Promise.resolve('g-other'),
    });

    expect((await linking.users.linkGoogle(3, google, tx)).linked).toBe(true);
    expect(linking.calls).toEqual(['revokeAll']);
    expect((await linked.users.linkGoogle(3, google, tx)).linked).toBe(false);
    expect(linked.calls).toEqual([]);
    expect((await rejection(other.users.linkGoogle(3, google, tx))).code).toBe(
      'GOOGLE_TOKEN_INVALID',
    );
  });
});

describe('users: the current password', () => {
  const withHash = (account: Account, hash: string | null, setPassword: unknown = sara) =>
    setup({
      findById: () => Promise.resolve(account),
      findPasswordHash: () => Promise.resolve(hash),
      setPasswordIf: () => Promise.resolve(setPassword),
    });

  it('sends an account without a password to the reset email', async () => {
    const { users } = withHash(sara, null);

    const error = await rejection(
      users.changePassword(3, { password: 'new2026x' }, { pendingChange: false }),
    );

    expect(error.code).toBe('PASSWORD_NOT_SET');
  });

  it('skips the check only when the token and the account both say a change is pending', async () => {
    const pending = { ...sara, mustChangePassword: true };

    const forced = withHash(pending, 'hash:temp');
    await forced.users.changePassword(3, { password: 'new2026x' }, { pendingChange: true });
    expect(forced.calls.filter((call) => call.startsWith('verify'))).toEqual([]);

    for (const [account, claim] of [
      [pending, false],
      [sara, true],
    ] as const) {
      const { users } = withHash(account, 'hash:temp');
      const error = await rejection(
        users.changePassword(3, { password: 'new2026x' }, { pendingChange: claim }),
      );
      expect(error.errors).toEqual({ currentPassword: ['required'] });
    }
  });

  it('refuses a wrong current password, and a password that changed meanwhile', async () => {
    const wrong = withHash(sara, 'hash:right');
    const raced = withHash(sara, 'hash:right', null);

    const request = (currentPassword: string) => ({ currentPassword, password: 'new2026x' });
    expect(
      (await rejection(wrong.users.changePassword(3, request('wrong'), { pendingChange: false })))
        .code,
    ).toBe('CURRENT_PASSWORD_INCORRECT');
    expect(
      (await rejection(raced.users.changePassword(3, request('right'), { pendingChange: false })))
        .code,
    ).toBe('CURRENT_PASSWORD_INCORRECT');
  });
});
