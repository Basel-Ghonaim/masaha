import { describe, expect, it } from 'vitest';

import type { RunInTransaction, Tx } from '../../db/index.ts';
import type { AccessTokens } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import { createLimiter, type Counter } from '../../shared/rate-limit/index.ts';
import type { SessionsService } from '../sessions/index.ts';
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

function setup({ sent = true, account = sara } = {}) {
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
    revokeAll: record('revokeAll'),
  } as unknown as SessionsService;
  const users = {
    findByEmail: () => Promise.resolve(account),
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
  it('keeps only the delivered link', async () => {
    const { auth, calls } = setup();

    await auth.forgotPassword({ email: 'sara@example.com' }, 'ip');

    expect(calls).toEqual(['keepOnlyResetToken']);
  });

  it('withdraws a link that was not sent, so the one in the inbox stays live', async () => {
    const { auth, calls } = setup({ sent: false });

    await auth.forgotPassword({ email: 'sara@example.com' }, 'ip');

    expect(calls).toEqual(['withdrawResetToken']);
  });

  it('issues nothing for an account that may not sign in', async () => {
    const { auth, calls } = setup({ account: { ...sara, suspendedAt: new Date() } });

    await auth.forgotPassword({ email: 'sara@example.com' }, 'ip');

    expect(calls).toEqual([]);
  });
});

describe('auth: refresh', () => {
  it('ends every session of a suspended account, and refuses it', async () => {
    const { auth, calls } = setup({ account: { ...sara, suspendedAt: new Date() } });

    await expect(auth.refresh('token')).rejects.toMatchObject({ code: 'ACCOUNT_SUSPENDED' });
    expect(calls).toEqual(['revokeAll']);
  });
});
