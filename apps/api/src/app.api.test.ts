import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from './app.ts';

const app = createApp({ corsOrigin: 'http://localhost:5173', logger: pino({ level: 'silent' }) });

describe('GET /health', () => {
  it('reports the API is up', async () => {
    const response = await request(app).get('/health');

    const body = response.body as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(['status', 'timestamp']);
    expect(body.status).toBe('ok');
    expect(Number.isNaN(Date.parse(String(body.timestamp)))).toBe(false);
  });

  it('sends the hardening headers and allows only the configured origin', async () => {
    const response = await request(app).get('/health').set('Origin', 'http://localhost:5173');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});
