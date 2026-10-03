import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../errors/index.ts';
import { createAccessTokens, type AccessClaims } from './accessToken.ts';
import { createRequireAuth } from './requireAuth.ts';

const tokens = createAccessTokens('a-test-secret-of-at-least-32-characters');
const requireAuth = createRequireAuth(tokens);

function requestWith(authorization?: string) {
  return {
    get: (name: string) => (name.toLowerCase() === 'authorization' ? authorization : undefined),
  } as unknown as Request;
}

async function run(guard: ReturnType<typeof requireAuth>, req: Request) {
  const next = vi.fn();
  try {
    await guard(req, {} as Response, next);
  } catch (error) {
    return { error: error as AppError, next };
  }
  return { error: undefined, next };
}

const pending: AccessClaims = { userId: 3, role: 'USER', mustChangePassword: true };
const settled: AccessClaims = { ...pending, mustChangePassword: false };

describe('requireAuth', () => {
  it('puts the claims of a valid bearer token on the request', async () => {
    const req = requestWith(`Bearer ${await tokens.sign(settled)}`);

    const { error, next } = await run(requireAuth(), req);

    expect(error).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
    expect(req.auth).toEqual(settled);
  });

  it.each([undefined, 'Bearer', 'Bearer not-a-token', 'Basic abc'])(
    'answers 401 for the header %s',
    async (header) => {
      const { error, next } = await run(requireAuth(), requestWith(header));

      expect(error?.type).toBe('unauthorized');
      expect(next).not.toHaveBeenCalled();
    },
  );

  it('answers PASSWORD_CHANGE_REQUIRED while a temporary password is pending', async () => {
    const { error, next } = await run(
      requireAuth(),
      requestWith(`Bearer ${await tokens.sign(pending)}`),
    );

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ type: 'forbidden', code: 'PASSWORD_CHANGE_REQUIRED' });
    expect(next).not.toHaveBeenCalled();
  });

  it('lets a pending password through the routes that allow it', async () => {
    const req = requestWith(`Bearer ${await tokens.sign(pending)}`);

    const { error } = await run(requireAuth({ allowPendingPasswordChange: true }), req);

    expect(error).toBeUndefined();
    expect(req.auth).toEqual(pending);
  });
});
