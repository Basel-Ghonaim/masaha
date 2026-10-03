import { Router } from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createApp } from '../../app.ts';
import { sendSuccess } from '../http/index.ts';
import { validate } from './index.ts';

const router = Router();
router.post(
  '/members',
  validate(z.object({ name: z.string().min(2), phone: z.string().regex(/^05\d{8}$/) })),
  (req, res) => {
    sendSuccess(res, req.body, { status: 201 });
  },
);
router.get(
  '/members/:id',
  validate(z.object({ id: z.coerce.number().int().positive() }), 'params'),
  validate(z.object({ page: z.coerce.number().int().min(1).default(1) }), 'query'),
  (req, res) => {
    sendSuccess(res, { params: req.params, query: req.query });
  },
);

const app = createApp({
  corsOrigin: 'http://localhost:5173',
  logger: pino({ level: 'silent' }),
  checkDatabase: () => Promise.resolve(true),
  apiRouter: router,
});

describe('validate()', () => {
  it('rejects an invalid body with validation and field-error codes', async () => {
    const response = await request(app).post('/api/v1/members').send({ name: 'A', phone: '123' });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      success: false,
      error: {
        type: 'validation',
        message: 'Validation failed',
        errors: { name: ['too_short'], phone: ['invalid_format'] },
        requestId: response.headers['x-request-id'],
      },
    });
  });

  it('rejects a request with no body as bad_request', async () => {
    const response = await request(app).post('/api/v1/members');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ success: false, error: { type: 'bad_request' } });
  });

  it('hands the controller the parsed body, without unknown keys', async () => {
    const response = await request(app)
      .post('/api/v1/members')
      .send({ name: 'Amal', phone: '0591234567', role: 'ADMIN' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true, data: { name: 'Amal', phone: '0591234567' } });
  });

  it('hands the controller coerced params and a defaulted query', async () => {
    const response = await request(app).get('/api/v1/members/7');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { params: { id: 7 }, query: { page: 1 } },
    });
  });

  it('rejects invalid params and query by field', async () => {
    const params = await request(app).get('/api/v1/members/abc');
    const query = await request(app).get('/api/v1/members/7?page=0');

    expect(params.status).toBe(422);
    expect(params.body).toMatchObject({ error: { errors: { id: ['invalid_format'] } } });
    expect(query.status).toBe(422);
    expect(query.body).toMatchObject({ error: { errors: { page: ['out_of_range'] } } });
  });
});
