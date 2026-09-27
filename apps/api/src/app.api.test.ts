import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from './app.ts';
import { isDatabaseUp, prisma } from './db/index.ts';

const options = { corsOrigin: 'http://localhost:5173', logger: pino({ level: 'silent' }) };
const app = createApp({ ...options, checkDatabase: () => isDatabaseUp(prisma) });

describe('GET /health', () => {
  it('reports the API and the database are up', async () => {
    const response = await request(app).get('/health');

    const body = response.body as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(['db', 'status', 'timestamp']);
    expect(body.status).toBe('ok');
    expect(body.db).toBe('up');
    expect(Number.isNaN(Date.parse(String(body.timestamp)))).toBe(false);
  });

  it('answers 503 when the database is down', async () => {
    const down = createApp({ ...options, checkDatabase: () => Promise.resolve(false) });

    const response = await request(down).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ status: 'error', db: 'down' });
  });

  it('sends the hardening headers and allows only the configured origin', async () => {
    const response = await request(app).get('/health').set('Origin', 'http://localhost:5173');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});
