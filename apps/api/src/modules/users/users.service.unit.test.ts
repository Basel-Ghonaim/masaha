import { describe, expect, it } from 'vitest';

import type { RunInTransaction, Tx } from '../../db/index.ts';
import type { AccessTokens } from '../../shared/auth/index.ts';
import type { AppError } from '../../shared/errors/index.ts';
import { createLimiter, type Counter } from '../../shared/rate-limit/index.ts';
import type { SessionsService } from '../sessions/index.ts';
import type { Account, UsersRepository } from './users.repository.ts';
import { createUsersService, googleIsAuthoritative, type GoogleAccount } from './users.service.ts';

const tx = {} as Tx;
const sara: Account = {
  id: 3,
  email: 'sara@gmail.com',
  name: 'Sara',
  role: 'USER',
  language: 'ar',
  mustChangePassword: false,
  temporaryPasswordExpiresAt: null,
  suspendedAt: null,
  sessionVersion: 0,
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
  const sessions = {
    revokeAll: () => {
      calls.push('revokeAll');
      return Promise.resolve();
    },
  } as unknown as SessionsService;
  const counter: Counter = {
    hit: () => Promise.resolve({ hits: 1, resetAt: new Date(Date.now() + 60_000) }),
    refund: () => Promise.resolve(),
  };
  const runInTransaction: RunInTransaction = (work) => work(tx);
  const users = createUsersService({
    accessTokens: { sign: () => Promise.resolve('access') } as unknown as AccessTokens,
    limiter: createLimiter(counter, () => new Date()),
    audit: () => Promise.reject(new Error('not asked here')),
    now: () => new Date(),
    repository: {
      lock: () => Promise.resolve(true),
      findById: () => Promise.resolve(sara),
      bumpSessionVersion: () => {
        calls.push('bumpSessionVersion');
        return Promise.resolve();
      },
      ...repository,
    } as unknown as UsersRepository,
    sessions,
    runInTransaction,
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
    expect(linking.calls).toEqual(['bumpSessionVersion', 'revokeAll']);
    expect((await linked.users.linkGoogle(3, google, tx)).linked).toBe(false);
    expect(linked.calls).toEqual([]);
    expect((await rejection(other.users.linkGoogle(3, google, tx))).code).toBe(
      'GOOGLE_TOKEN_INVALID',
    );
  });
});
