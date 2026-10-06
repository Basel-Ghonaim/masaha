import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import type { SpaceLink } from './can.ts';
import { loadSpaceLinks, spaceOf } from './spaceLinks.ts';

const OWNER: SpaceLink = { userId: 2, role: 'OWNER', deactivatedAt: null };

/** Runs the loader on a request for the space `spaceId`, as Express would. */
async function load(spaceId: string, links: readonly SpaceLink[] = [OWNER]) {
  const asked: number[] = [];
  const req = { params: { spaceId } } as unknown as Request;
  const next = vi.fn();
  await loadSpaceLinks((id) => {
    asked.push(id);
    return Promise.resolve(links);
  })(req, {} as Response, next);
  return { req, next, asked };
}

describe('loadSpaceLinks', () => {
  it('puts the space and its links on the request, and refuses no one', async () => {
    const { req, next, asked } = await load('7');

    expect(asked).toEqual([7]);
    expect(spaceOf(req)).toEqual({ id: 7, links: [OWNER] });
    expect(next).toHaveBeenCalledOnce();
  });

  it('lets a space with no links through, as an unverified one', async () => {
    const { req, next } = await load('7', []);

    expect(spaceOf(req)).toEqual({ id: 7, links: [] });
    expect(next).toHaveBeenCalledOnce();
  });

  it('answers not_found for a space id that names no row, before loading anything', async () => {
    await expect(load('abc')).rejects.toMatchObject({ type: 'not_found' });
  });
});

describe('spaceOf', () => {
  it('answers not_found when the loader did not run', () => {
    expect(() => spaceOf({} as Request)).toThrow(expect.objectContaining({ type: 'not_found' }));
  });
});
