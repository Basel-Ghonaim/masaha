import { paginationQuerySchema, type ErrorType, type PaginationQuery } from '@masaha/shared';
import { Router } from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.ts';
import { buildPaginationMeta, sendNoContent, sendSuccess } from '../http/index.ts';
import { validate } from '../validation/index.ts';
import { AppError } from './index.ts';

const factories = {
  bad_request: () => AppError.badRequest(),
  unauthorized: () => AppError.unauthorized('INVALID_CREDENTIALS'),
  forbidden: () => AppError.forbidden('SPACE_NOT_MANAGED'),
  not_found: () => AppError.notFound(),
  conflict: () => AppError.conflict('MEMBER_ALREADY_CHECKED_IN'),
  payload_too_large: () => AppError.payloadTooLarge(),
  unsupported_media_type: () => AppError.unsupportedMediaType(),
  validation: () => AppError.validation({ phone: ['invalid_format'] }),
  rate_limit: () => AppError.rateLimit(),
  server: () => AppError.server(),
  service_unavailable: () => AppError.serviceUnavailable(),
} satisfies Record<ErrorType, () => AppError>;

const expected: Record<ErrorType, { status: number; code?: string; errors?: object }> = {
  bad_request: { status: 400 },
  unauthorized: { status: 401, code: 'INVALID_CREDENTIALS' },
  forbidden: { status: 403, code: 'SPACE_NOT_MANAGED' },
  not_found: { status: 404 },
  conflict: { status: 409, code: 'MEMBER_ALREADY_CHECKED_IN' },
  payload_too_large: { status: 413 },
  unsupported_media_type: { status: 415 },
  validation: { status: 422, errors: { phone: ['invalid_format'] } },
  rate_limit: { status: 429 },
  server: { status: 500 },
  service_unavailable: { status: 503 },
};

const router = Router();
router.get('/items', (_req, res) => {
  sendSuccess(res, [{ id: 1 }]);
});
router.post('/items', (req, res) => {
  sendSuccess(res, req.body, { status: 201 });
});
router.get('/pages', validate(paginationQuerySchema, 'query'), (req, res) => {
  sendSuccess(res, [], { meta: buildPaginationMeta(req.query as unknown as PaginationQuery, 45) });
});
router.delete('/items/1', (_req, res) => {
  sendNoContent(res);
});
router.get('/errors/:type', (req) => {
  throw factories[req.params.type as ErrorType]();
});
router.get('/bug', () => {
  throw new Error('secret detail at /srv/app');
});
router.get('/async-bug', async () => {
  await Promise.resolve();
  throw new Error('secret detail at /srv/app');
});

const app = createApp({
  corsOrigin: 'http://localhost:5173',
  logger: pino({ level: 'silent' }),
  checkDatabase: () => Promise.resolve(true),
  apiRouter: router,
});

describe('success envelope', () => {
  it('wraps data', async () => {
    const response = await request(app).get('/api/v1/items');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: [{ id: 1 }] });
  });

  it('takes another status', async () => {
    const response = await request(app).post('/api/v1/items').send({ name: 'Desk' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true, data: { name: 'Desk' } });
  });

  it('carries pagination meta for a list', async () => {
    const response = await request(app).get('/api/v1/pages?page=2&limit=20');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [],
      meta: {
        currentPage: 2,
        limit: 20,
        totalPages: 3,
        totalRecords: 45,
        hasNextPage: true,
        hasPreviousPage: true,
      },
    });
  });

  it('sends no body with 204', async () => {
    const response = await request(app).delete('/api/v1/items/1');

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
  });
});

describe('error envelope', () => {
  it.each(Object.entries(expected))(
    '%s → its status and shape',
    async (type, { status, ...rest }) => {
      const response = await request(app).get(`/api/v1/errors/${type}`);

      expect(response.status).toBe(status);
      expect(response.body).toEqual({
        success: false,
        error: { type, message: expect.any(String) as unknown, ...rest },
      });
    },
  );

  it('answers an unknown route under /api/v1 with not_found', async () => {
    const response = await request(app).get('/api/v1/anything');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: { type: 'not_found', message: 'No route for GET /api/v1/anything' },
    });
  });

  it('answers malformed JSON with bad_request', async () => {
    const response = await request(app)
      .post('/api/v1/items')
      .set('Content-Type', 'application/json')
      .send('{"name":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: { type: 'bad_request', message: 'Malformed request' },
    });
  });

  it('refuses a JSON body over 16 kB with payload_too_large', async () => {
    const response = await request(app)
      .post('/api/v1/items')
      .send({ note: 'x'.repeat(17 * 1024) });

    expect(response.status).toBe(413);
    expect(response.body).toMatchObject({ success: false, error: { type: 'payload_too_large' } });
  });

  it.each(['/api/v1/bug', '/api/v1/async-bug'])(
    'turns an unknown error from %s into server, with no detail or stack',
    async (path) => {
      const response = await request(app).get(path);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: { type: 'server', message: 'Internal server error' },
      });
      expect(response.text).not.toMatch(/secret|stack|\/srv\//);
    },
  );
});
