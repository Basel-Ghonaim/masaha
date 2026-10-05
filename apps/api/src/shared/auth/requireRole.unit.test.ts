import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import type { AppError } from '../errors/index.ts';
import type { AccessClaims } from './accessToken.ts';
import { requireRole } from './requireRole.ts';

function run(guard: ReturnType<typeof requireRole>, auth?: AccessClaims) {
  const next = vi.fn();
  try {
    void guard({ auth } as Request, {} as Response, next);
  } catch (error) {
    return { error: error as AppError, next };
  }
  return { error: undefined, next };
}

const claims = (role: AccessClaims['role']): AccessClaims => ({
  userId: 7,
  role,
  mustChangePassword: false,
});

describe('requireRole', () => {
  it('lets a listed role through', () => {
    const { error, next } = run(requireRole('ADMIN'), claims('ADMIN'));

    expect(error).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it.each(['USER', 'OWNER'] as const)('answers 403 for the role %s', (role) => {
    const { error, next } = run(requireRole('ADMIN'), claims(role));

    expect(error).toMatchObject({ type: 'forbidden', code: undefined });
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 401 when no claims are on the request', () => {
    const { error, next } = run(requireRole('ADMIN'));

    expect(error?.type).toBe('unauthorized');
    expect(next).not.toHaveBeenCalled();
  });
});
