import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import type { AppError } from '../errors/index.ts';
import type { SpaceLink } from './can.ts';
import type { SignedIn } from './requireAuth.ts';
import { requireCan } from './requireCan.ts';
import type { LoadedSpace } from './spaceLinks.ts';

function run(auth?: SignedIn, space?: LoadedSpace) {
  const next = vi.fn();
  try {
    void requireCan('space.photos.manage')(
      { auth, space } as unknown as Request,
      {} as Response,
      next,
    );
  } catch (error) {
    return { error: error as AppError, next };
  }
  return { error: undefined, next };
}

const claims: SignedIn = { userId: 7, role: 'USER', tokenPendingChange: false };

/** A space where user 7 holds a `role` link, beside an active owner, so the space is verified. */
function spaceWith(role: SpaceLink['role']): LoadedSpace {
  const links: SpaceLink[] = [
    { userId: 2, role: 'OWNER', deactivatedAt: null },
    { userId: 7, role, deactivatedAt: null },
  ];
  return { id: 12, links, linksUnder: () => Promise.resolve(links) };
}

describe('requireCan', () => {
  it('lets the caller through when can() allows the action on the route’s space', () => {
    const { error, next } = run(claims, spaceWith('OWNER'));

    expect(error).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it('answers 403 when can() refuses the action: reception may not manage photos', () => {
    const { error, next } = run(claims, spaceWith('RECEPTION'));

    expect(error).toMatchObject({ type: 'forbidden', code: undefined });
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 401 when no claims are on the request', () => {
    const { error, next } = run(undefined, spaceWith('OWNER'));

    expect(error).toMatchObject({ type: 'unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 404 when no space was loaded for the route', () => {
    const { error, next } = run(claims);

    expect(error).toMatchObject({ type: 'not_found' });
    expect(next).not.toHaveBeenCalled();
  });
});
