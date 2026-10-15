import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler, notFoundHandler } from '../errors/index.ts';
import { requireSpaceAccess } from './spaceAccess.ts';

describe('requireSpaceAccess', () => {
  it('accepts an active linked space and preserves linksUnder transaction reads', async () => {
    const calls: Array<{ id: number; tx?: object }> = [];
    const transaction = {};
    const app = express();
    app.use(
      '/spaces/:spaceId',
      (req, _res, next) => {
        req.auth = { userId: 7, role: 'OWNER', tokenPendingChange: false };
        next();
      },
      requireSpaceAccess((id, tx) => {
        calls.push({ id, tx });
        return Promise.resolve([{ userId: 7, role: 'OWNER', deactivatedAt: null }]);
      }),
      async (req, res) => {
        await req.space?.linksUnder(transaction as never);
        res.json({ id: req.space?.id, links: req.space?.links });
      },
    );
    app.use(notFoundHandler);
    app.use(errorHandler);

    const response = await request(app).get('/spaces/12');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 12,
      links: [{ userId: 7, role: 'OWNER', deactivatedAt: null }],
    });
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual({ id: 12, tx: transaction });
    expect(calls[1]?.tx).toBe(transaction);
  });

  it('returns not_found when there is no active link', async () => {
    const app = express();
    app.use(
      '/spaces/:spaceId',
      (req, _res, next) => {
        req.auth = { userId: 7, role: 'OWNER', tokenPendingChange: false };
        next();
      },
      requireSpaceAccess(() =>
        Promise.resolve([{ userId: 7, role: 'OWNER', deactivatedAt: new Date('2026-01-01') }]),
      ),
      (_req, res) => res.sendStatus(200),
    );
    app.use(notFoundHandler);
    app.use(errorHandler);

    const response = await request(app).get('/spaces/12');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: { type: 'not_found' } });
  });
});
