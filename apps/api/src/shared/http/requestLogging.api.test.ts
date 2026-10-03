import { Writable } from 'node:stream';

import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.ts';
import { AppError } from '../errors/index.ts';
import { createLogger } from './requestLogging.ts';

const lines: string[] = [];
const stream = new Writable({
  write(chunk: Buffer, _encoding, done) {
    lines.push(chunk.toString());
    done();
  },
});

const router = Router();
router.get('/missing', () => {
  throw AppError.notFound();
});
router.get('/bug', () => {
  throw new Error('bug');
});

const app = createApp({
  corsOrigin: 'http://localhost:5173',
  logger: createLogger('info', stream),
  checkDatabase: () => Promise.resolve(true),
  apiRouter: router,
});

/** The request log line of the response with this request id. */
function logLineOf(requestId: string): Record<string, unknown> {
  const line = lines
    .map((text) => JSON.parse(text) as { req?: { id?: string }; responseTime?: number })
    .find((entry) => entry.req?.id === requestId && entry.responseTime !== undefined);
  if (!line) throw new Error(`No log line for request ${requestId}`);
  return line;
}

describe('the request log', () => {
  it('carries the request id and never the session headers', async () => {
    const response = await request(app)
      .get('/health')
      .set('Cookie', 'masaha_refresh=secret-refresh')
      .set('Authorization', 'Bearer secret-access');

    const id = String(response.headers['x-request-id']);
    expect(logLineOf(id)).toMatchObject({ level: 30, res: { statusCode: 200 } });
    expect(lines.join('\n')).not.toMatch(/secret-refresh|secret-access/);
  });

  it('logs a 4xx at warn and a 5xx at error', async () => {
    const missing = await request(app).get('/api/v1/missing');
    const bug = await request(app).get('/api/v1/bug');

    expect(logLineOf(String(missing.headers['x-request-id']))).toMatchObject({ level: 40 });
    expect(logLineOf(String(bug.headers['x-request-id']))).toMatchObject({ level: 50 });
  });
});
