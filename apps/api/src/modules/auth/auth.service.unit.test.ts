import { describe, expect, it } from 'vitest';

import type { RunInTransaction, Tx } from '../../db/index.ts';
import type { AccessTokens } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import { createLimiter, type Counter } from '../../shared/rate-limit/index.ts';
import type { Recovery, SessionsService } from '../sessions/index.ts';
import type { SpaceLinksService } from '../space-links/index.ts';
import type { Account, UsersService } from '../users/index.ts';
import { createAuthService } from './auth.service.ts';
import type { EmailSender } from './email/emailSender.ts';

const sara: Account = {
  id: 3,
  email: 'sara@example.com',
  name: 'Sara',
  role: 'USER',
  language: 'ar',
  mustChangePassword: false,
  suspendedAt: null,
};

/** A recovery that may ask for another link now. */
const askable: Recovery = {
  id: 5,
  userId: 3,
  maskedEmail: 's•••@example.com',
  emailDigest: 'digest',
  linkChecked: false,
  resendInSeconds: 0,
  canResend: true,
  remainingMs: 3_600_000,
};

function setup({ sent = true, account = sara, recovery = askable } = {}) {
  const calls: string[] = [];
  const record = (call: string) => () => {
    calls.push(call);
    return Promise.resolve();
  };
  const counter: Counter = {
    hit: () => Promise.resolve({ hits: 1, resetAt: new Date(Date.now() + 60_000) }),
    refund: () => Promise.resolve(),
  };
  const sessions = {
    issueResetToken: () => Promise.resolve({ token: 'reset', id: 9 }),
    keepOnlyResetToken: record('keepOnlyResetToken'),
    withdrawResetToken: record('withdrawResetToken'),
    ownerOf: () => Promise.resolve(3),
    resetTokenOwner: () => Promise.resolve(undefined),
    revokeAll: record('revokeAll'),
    openRecovery: () => {
      calls.push('openRecovery');
      return Promise.resolve({ key: 'key', recovery: { ...askable, resendInSeconds: 60 } });
    },
    recovery: () => Promise.resolve(recovery),
    recordResend: () => {
      calls.push('recordResend');
      return Promise.resolve({ ...recovery, resendInSeconds: 60 });
    },
  } as unknown as SessionsService;
  const users = {
    findByEmail: () => Promise.resolve(account),
    get: () => {
      calls.push('get');
      return Promise.resolve(account);
    },
    hashPassword: () => {
      calls.push('hashPassword');
      return Promise.resolve('hash');
    },
    maySignIn: (candidate: Account) => !candidate.suspendedAt,
    lockAccount: () => Promise.resolve(account),
    assertMaySignIn: () => {
      throw AppError.forbidden('ACCOUNT_SUSPENDED');
    },
  } as unknown as UsersService;
  const email: EmailSender = {
    send: () => Promise.resolve(sent ? { sent: true } : { sent: false, reason: 'smtp' }),
  };
  const runInTransaction: RunInTransaction = (work) => work({} as Tx);
  const auth = createAuthService({
    users,
    sessions,
    spaceLinks: {} as SpaceLinksService,
    accessTokens: {} as AccessTokens,
    limiter: createLimiter(counter, () => new Date()),
    runInTransaction,
    google: undefined,
    emailSender: email,
    webOrigin: 'https://masaha.example',
  });
  return { auth, calls };
}

describe('auth: the forgotten password', () => {
  it('opens a recovery, then keeps only the delivered link', async () => {
    const { auth, calls } = setup();

    await auth.forgotPassword({ email: 'sara@example.com' }, 'ip', undefined);

    expect(calls).toEqual(['openRecovery', 'keepOnlyResetToken']);
  });

  it('withdraws a link that was not sent, so the one in the inbox stays live', async () => {
    const { auth, calls } = setup({ sent: false });

    await auth.forgotPassword({ email: 'sara@example.com' }, 'ip', undefined);

    expect(calls).toEqual(['openRecovery', 'withdrawResetToken']);
  });

  it('opens a recovery but issues nothing for an account that may not sign in', async () => {
    const { auth, calls } = setup({ account: { ...sara, suspendedAt: new Date() } });

    await auth.forgotPassword({ email: 'sara@example.com' }, 'ip', undefined);

    expect(calls).toEqual(['openRecovery']);
  });
});

describe('auth: resending the link', () => {
  it('records the ask before it reads the account, then sends the link', async () => {
    const { auth, calls } = setup();

    await auth.resendResetLink('ip', 'key');

    expect(calls).toEqual(['recordResend', 'get', 'keepOnlyResetToken']);
  });

  it('records the ask but sends nothing for a recovery with no account behind it', async () => {
    const { auth, calls } = setup({ recovery: { ...askable, userId: null } });

    const answer = await auth.resendResetLink('ip', 'key');

    expect(calls).toEqual(['recordResend']);
    expect(answer.position).toEqual({
      step: 'sent',
      email: 's•••@example.com',
      resendInSeconds: 60,
      canResend: true,
    });
  });

  it('records the ask but sends nothing to an account suspended since the request', async () => {
    const { auth, calls } = setup({ account: { ...sara, suspendedAt: new Date() } });

    await auth.resendResetLink('ip', 'key');

    expect(calls).toEqual(['recordResend', 'get']);
  });
});

describe('auth: refresh', () => {
  it('ends every session of a suspended account, and refuses it', async () => {
    const { auth, calls } = setup({ account: { ...sara, suspendedAt: new Date() } });

    await expect(auth.refresh('token')).rejects.toMatchObject({ code: 'ACCOUNT_SUSPENDED' });
    expect(calls).toEqual(['revokeAll']);
  });
});

describe('auth: the reset', () => {
  it('reads the recovery before hashing: one with no link checked never reaches bcrypt', async () => {
    const { auth, calls } = setup();

    await expect(auth.resetPassword({ password: 'new2026x' }, 'ip', 'key')).rejects.toMatchObject({
      code: 'RECOVERY_INVALID',
    });
    expect(calls).toEqual([]);
  });
});
