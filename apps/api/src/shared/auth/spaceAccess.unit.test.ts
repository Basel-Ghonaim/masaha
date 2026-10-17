import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import type { Tx } from '../../db/index.ts';
import type { SpaceLink } from './can.ts';
import { requireSpaceAccess } from './spaceAccess.ts';
import { spaceOf } from './spaceLinks.ts';

const OWNER: SpaceLink = { userId: 7, role: 'OWNER', deactivatedAt: null };

describe('requireSpaceAccess', () => {
  it('reads the space’s links again with the transaction it is given', async () => {
    const asked: { id: number; tx: Tx | undefined }[] = [];
    const req = {
      params: { spaceId: '12' },
      auth: { userId: 7, role: 'OWNER', tokenPendingChange: false },
    } as unknown as Request;
    const next = vi.fn();
    await requireSpaceAccess((id, tx) => {
      asked.push({ id, tx });
      return Promise.resolve([OWNER]);
    })(req, {} as Response, next);
    const tx = {} as Tx;

    expect(await spaceOf(req).linksUnder(tx)).toEqual([OWNER]);
    expect(asked).toEqual([
      { id: 12, tx: undefined },
      { id: 12, tx },
    ]);
    expect(asked[1]?.tx).toBe(tx);
    expect(next).toHaveBeenCalledOnce();
  });
});
