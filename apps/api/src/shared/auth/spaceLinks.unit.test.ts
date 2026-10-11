import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import type { Tx } from '../../db/index.ts';
import type { SpaceLink } from './can.ts';
import { loadSpaceLinks, spaceOf } from './spaceLinks.ts';

const OWNER: SpaceLink = { userId: 2, role: 'OWNER', deactivatedAt: null };

/** Runs the loader on a request for the space `spaceId`, as Express would. */
async function load(spaceId: string, links: readonly SpaceLink[] = [OWNER]) {
  const asked: { id: number; tx: Tx | undefined }[] = [];
  const req = { params: { spaceId } } as unknown as Request;
  const next = vi.fn();
  await loadSpaceLinks((id, tx) => {
    asked.push({ id, tx });
    return Promise.resolve(links);
  })(req, {} as Response, next);
  return { req, next, asked };
}

describe('loadSpaceLinks', () => {
  it('puts the space and its links on the request, and refuses no one', async () => {
    const { req, next, asked } = await load('7');

    expect(asked).toEqual([{ id: 7, tx: undefined }]);
    expect(spaceOf(req)).toMatchObject({ id: 7, links: [OWNER] });
    expect(next).toHaveBeenCalledOnce();
  });

  it('lets a space with no links through, as an unverified one', async () => {
    const { req, next } = await load('7', []);

    expect(spaceOf(req)).toMatchObject({ id: 7, links: [] });
    expect(next).toHaveBeenCalledOnce();
  });

  it('reads the same space’s links again with the transaction it is given', async () => {
    const { req, asked } = await load('7');
    const tx = {} as Tx;

    expect(await spaceOf(req).linksUnder(tx)).toEqual([OWNER]);
    expect(asked).toEqual([
      { id: 7, tx: undefined },
      { id: 7, tx },
    ]);
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
