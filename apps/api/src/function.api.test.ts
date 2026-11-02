import type { RequestListener } from 'node:http';

import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The function's environment: a valid one outside development (smtp, local storage), as the API
// lane can run it. The database is the lane's own (vitest.config.ts sets DATABASE_URL).
const VALID = {
  NODE_ENV: 'test',
  CORS_ORIGIN: 'http://localhost:5173',
  JWT_SECRET: 'a-test-secret-of-at-least-32-characters',
  EMAIL_MODE: 'smtp',
  SMTP_HOST: 'smtp.example.com',
  SMTP_USER: 'masaha@example.com',
  SMTP_PASSWORD: 'an-app-password',
  EMAIL_FROM: 'Masaha <masaha@example.com>',
  LOG_LEVEL: 'silent',
};

/** The function entry's handler, loaded afresh with `env`, as a new instance would load it. */
async function loadHandler(env: Record<string, string>): Promise<RequestListener> {
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  const module = await import('./function.ts');
  return module.default;
}

// The first load transforms the whole app, which a cold lane takes seconds to do.
const LOAD_TIMEOUT_MS = 30_000;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('the function entry', () => {
  it(
    'answers through the same app, on a plain Node server, and starts no timer',
    async () => {
      const setInterval = vi.spyOn(globalThis, 'setInterval');
      const handler = await loadHandler(VALID);

      const health = await request(handler).get('/health');
      const missing = await request(handler).get('/api/v1/no-such-route');

      expect(health.status).toBe(200);
      expect(health.body).toMatchObject({ status: 'ok', db: 'up' });
      expect(missing.status).toBe(404);
      expect(missing.body).toMatchObject({
        success: false,
        error: { type: 'not_found', requestId: expect.any(String) as string },
      });
      // The local server's timer is the only setInterval in the API (shared/jobs, startEvery).
      expect(setInterval).not.toHaveBeenCalled();
    },
    LOAD_TIMEOUT_MS,
  );

  it(
    'answers the error envelope on an invalid environment, naming the variable, never its value',
    async () => {
      const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      const handler = await loadHandler({ ...VALID, JWT_SECRET: 'too-short-a-secret' });

      const first = await request(handler).post('/api/v1/auth/login').send({ email: 'a@b.co' });
      const second = await request(handler).get('/api/v1/lookups');

      for (const response of [first, second]) {
        expect(response.status).toBe(500);
        expect(response.body).toMatchObject({
          success: false,
          error: { type: 'server', requestId: expect.any(String) as string },
        });
      }
      const written = stderr.mock.calls.map(([chunk]) => String(chunk)).join('');
      expect(written).toContain('JWT_SECRET');
      expect(written).not.toContain('too-short-a-secret');
      // Validated once per instance: one message, however many requests.
      expect(written.match(/Invalid environment/g)).toHaveLength(1);
    },
    LOAD_TIMEOUT_MS,
  );
});
