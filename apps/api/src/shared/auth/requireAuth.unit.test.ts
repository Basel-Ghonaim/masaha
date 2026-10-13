import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../errors/index.ts';
import { createAccessTokens, type AccessClaims } from './accessToken.ts';
import { createRequireAuth, type SignedInAccount } from './requireAuth.ts';

const tokens = createAccessTokens('a-test-secret-of-at-least-32-characters');

const active: SignedInAccount = {
  role: 'OWNER',
  mustChangePassword: false,
  suspended: false,
  sessionVersion: 2,
};

/** The guard over an account reader that answers `account`, and the ids it was asked for. */
function guardOver(account: SignedInAccount | null) {
  const asked: number[] = [];
  const requireAuth = createRequireAuth(tokens, (userId) => {
    asked.push(userId);
    return Promise.resolve(account);
  });
  return { requireAuth, asked };
}

function requestWith(authorization?: string) {
  return {
    get: (name: string) => (name.toLowerCase() === 'authorization' ? authorization : undefined),
  } as unknown as Request;
}

async function bearer(claims: AccessClaims) {
  return requestWith(`Bearer ${await tokens.sign(claims)}`);
}

async function run(guard: ReturnType<ReturnType<typeof createRequireAuth>>, req: Request) {
  const next = vi.fn();
  try {
    await guard(req, {} as Response, next);
  } catch (error) {
    return { error: error as AppError, next };
  }
  return { error: undefined, next };
}

const settled: AccessClaims = { userId: 3, mustChangePassword: false, sessionVersion: 2 };
const pending: AccessClaims = { userId: 3, mustChangePassword: true, sessionVersion: 2 };

describe('requireAuth', () => {
  it('puts the account’s role now and the token’s pending claim on the request', async () => {
    const { requireAuth, asked } = guardOver(active);
    const req = await bearer(settled);

    const { error, next } = await run(requireAuth(), req);

    expect(error).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
    expect(asked).toEqual([3]);
    expect(req.auth).toEqual({ userId: 3, role: 'OWNER', tokenPendingChange: false });
  });

  it.each([undefined, 'Bearer', 'Bearer not-a-token', 'Basic abc'])(
    'answers 401 for the header %s, without reading any account',
    async (header) => {
      const { requireAuth, asked } = guardOver(active);

      const { error, next } = await run(requireAuth(), requestWith(header));

      expect(error?.type).toBe('unauthorized');
      expect(next).not.toHaveBeenCalled();
      expect(asked).toEqual([]);
    },
  );

  it('answers 401 when the token names no account', async () => {
    const { error, next } = await run(guardOver(null).requireAuth(), await bearer(settled));

    expect(error).toMatchObject({ type: 'unauthorized', code: undefined });
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 401, with no code, for a suspended account, even where a pending change is allowed', async () => {
    const { requireAuth } = guardOver({ ...active, suspended: true });

    for (const guard of [requireAuth(), requireAuth({ allowPendingPasswordChange: true })]) {
      const { error, next } = await run(guard, await bearer(settled));

      expect(error).toMatchObject({ type: 'unauthorized', code: undefined });
      expect(next).not.toHaveBeenCalled();
    }
  });

  it('answers 401, with no code, for a token signed under another session version, even where a pending change is allowed', async () => {
    for (const sessionVersion of [1, 3]) {
      const { requireAuth } = guardOver({ ...active, sessionVersion });

      for (const guard of [requireAuth(), requireAuth({ allowPendingPasswordChange: true })]) {
        const { error, next } = await run(guard, await bearer(pending));

        expect(error).toMatchObject({ type: 'unauthorized', code: undefined });
        expect(next).not.toHaveBeenCalled();
      }
    }
  });

  it('answers PASSWORD_CHANGE_REQUIRED when the token says a change is pending', async () => {
    const { error, next } = await run(guardOver(active).requireAuth(), await bearer(pending));

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ type: 'forbidden', code: 'PASSWORD_CHANGE_REQUIRED' });
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 401, with no code, when only the account says a change is pending, even where one is allowed', async () => {
    const { requireAuth } = guardOver({ ...active, mustChangePassword: true });

    for (const guard of [requireAuth(), requireAuth({ allowPendingPasswordChange: true })]) {
      const { error, next } = await run(guard, await bearer(settled));

      expect(error).toMatchObject({ type: 'unauthorized', code: undefined });
      expect(next).not.toHaveBeenCalled();
    }
  });

  it('lets a pending change through the routes that allow it', async () => {
    const { requireAuth } = guardOver({ ...active, mustChangePassword: true });
    const req = await bearer(pending);

    const { error } = await run(requireAuth({ allowPendingPasswordChange: true }), req);

    expect(error).toBeUndefined();
    expect(req.auth).toEqual({ userId: 3, role: 'OWNER', tokenPendingChange: true });
  });
});
