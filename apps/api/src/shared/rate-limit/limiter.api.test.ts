import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApi, createApp } from '../../app.ts';
import { prisma } from '../../db/index.ts';

const app = createApp({
  corsOrigin: 'http://localhost:5173',
  logger: pino({ level: 'silent' }),
  checkDatabase: () => Promise.resolve(true),
  apiRouter: createApi(),
});

describe('the general rate limit', () => {
  it('counts every API request, and answers 429 with its headers over the guest ceiling', async () => {
    await request(app).get('/api/v1/anything');
    const [row] = await prisma.rateLimit.findMany();
    expect(row).toMatchObject({
      hits: 1,
      key: expect.stringMatching(/^general-guest:[0-9a-f]{64}$/) as unknown,
    });

    await prisma.rateLimit.update({ where: { key: row?.key ?? '' }, data: { hits: 1_200 } });
    const response = await request(app).get('/api/v1/anything');

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      success: false,
      error: {
        type: 'rate_limit',
        message: 'Rate limit general-guest reached',
        requestId: response.headers['x-request-id'],
      },
    });
    const retryAfter = Number(response.headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(900);
    expect(response.headers['ratelimit-policy']).toBe('"general-guest";q=1200;w=900');
    expect(response.headers.ratelimit).toBe(`"general-guest";r=0;t=${String(retryAfter)}`);
  });

  it('leaves /health uncounted', async () => {
    await request(app).get('/health');

    expect(await prisma.rateLimit.count()).toBe(0);
  });
});
