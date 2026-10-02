import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp, createAppFromEnv } from './app.ts';
import { loadEnv } from './config/index.ts';
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

describe('createAppFromEnv', () => {
  it('wires the ports as the environment says: outside development, Secure cookies', async () => {
    const app = createAppFromEnv(
      loadEnv({
        NODE_ENV: 'test',
        CORS_ORIGIN: 'http://localhost:5173',
        DATABASE_URL: 'postgresql://masaha:masaha@localhost:5433/masaha_test',
        JWT_SECRET: 'a-test-secret-of-at-least-32-characters',
        EMAIL_MODE: 'smtp',
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'masaha@example.com',
        SMTP_PASSWORD: 'an-app-password',
        EMAIL_FROM: 'Masaha <masaha@example.com>',
      }),
      { logger: pino({ level: 'silent' }), checkDatabase: () => Promise.resolve(true) },
    );

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Sara', email: 'from-env@example.com', password: 'gaza2026' });

    expect(response.status).toBe(201);
    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies.every((cookie) => cookie.includes('; Secure'))).toBe(true);
  });
});
