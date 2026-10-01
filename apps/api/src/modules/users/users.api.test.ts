import { Router } from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  accessTokens,
  cookieValue,
  createAccount,
  createTestApp,
  PASSWORD,
} from '../../../test/app.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { createApp } from '../../app.ts';
import { prisma } from '../../db/index.ts';
import { createRequireAuth } from '../../shared/auth/index.ts';
import { sendSuccess } from '../../shared/http/index.ts';

const app = createTestApp();
const NEW_PASSWORD = 'mine2026x';

// A route behind the guard as every protected route uses it, with no exception for a pending
// password: what a user with a temporary password cannot reach until they change it.
const probe = Router();
probe.get('/probe', createRequireAuth(accessTokens)(), (req, res) => {
  sendSuccess(res, { userId: req.auth?.userId });
});
const protectedApp = createApp({
  corsOrigin: 'http://localhost:5173',
  logger: pino({ level: 'silent' }),
  checkDatabase: () => Promise.resolve(true),
  apiRouter: probe,
});

beforeEach(async () => {
  await resetDatabase(prisma);
});

interface SignedIn {
  accessToken: string;
  refreshToken: string;
}

async function signIn(email = 'sara@example.com', password = PASSWORD): Promise<SignedIn> {
  const response = await request(app).post('/api/v1/auth/login').send({ email, password });
  const { accessToken } = (response.body as { data: { accessToken: string } }).data;
  return { accessToken, refreshToken: cookieValue(response, 'masaha_refresh') ?? '' };
}

function changePassword(accessToken: string | undefined, body: object) {
  const call = request(app).post('/api/v1/me/password').send(body);
  return accessToken ? call.set('Authorization', `Bearer ${accessToken}`) : call;
}

function refresh(refreshToken: string) {
  return request(app).post('/api/v1/auth/refresh').set('Cookie', `masaha_refresh=${refreshToken}`);
}

function reachProtected(accessToken: string) {
  return request(protectedApp).get('/api/v1/probe').set('Authorization', `Bearer ${accessToken}`);
}

describe('POST /me/password: the forced change', () => {
  it('lets a temporary password be replaced without the current one, and the session goes on', async () => {
    const user = await createAccount({ mustChangePassword: true });
    const before = await signIn();
    expect((await reachProtected(before.accessToken)).body).toMatchObject({
      error: { code: 'PASSWORD_CHANGE_REQUIRED' },
    });

    const changed = await changePassword(before.accessToken, { password: NEW_PASSWORD });

    expect(changed.status).toBe(200);
    const { accessToken } = (changed.body as { data: { accessToken: string } }).data;
    expect(await accessTokens.verify(accessToken)).toMatchObject({ mustChangePassword: false });
    expect((await reachProtected(accessToken)).status).toBe(200);

    const renewed = await refresh(cookieValue(changed, 'masaha_refresh') ?? '');
    expect(renewed.status).toBe(200);
    expect(renewed.body).toMatchObject({
      data: { user: { id: user.id, mustChangePassword: false } },
    });
    const { accessToken: refreshed } = (renewed.body as { data: { accessToken: string } }).data;
    expect((await reachProtected(refreshed)).body).toEqual({
      success: true,
      data: { userId: user.id },
    });

    expect((await refresh(before.refreshToken)).status).toBe(401);
    expect((await signIn('sara@example.com', NEW_PASSWORD)).accessToken).toBeTruthy();
  });
});

describe('POST /me/password: a voluntary change', () => {
  it('needs the current password', async () => {
    await createAccount();
    const { accessToken } = await signIn();

    const missing = await changePassword(accessToken, { password: NEW_PASSWORD });
    const wrong = await changePassword(accessToken, {
      currentPassword: 'wrong-pass1',
      password: NEW_PASSWORD,
    });

    expect(missing.status).toBe(422);
    expect(missing.body).toMatchObject({ error: { errors: { currentPassword: ['required'] } } });
    expect(wrong.status).toBe(400);
    expect(wrong.body).toMatchObject({
      error: { type: 'bad_request', code: 'CURRENT_PASSWORD_INCORRECT' },
    });
  });

  it('ends every other session and keeps this device signed in', async () => {
    await createAccount();
    const laptop = await signIn();
    const phone = await signIn();

    const changed = await changePassword(phone.accessToken, {
      currentPassword: PASSWORD,
      password: NEW_PASSWORD,
    });

    expect(changed.status).toBe(200);
    expect((await refresh(laptop.refreshToken)).status).toBe(401);
    expect((await refresh(phone.refreshToken)).status).toBe(401);
    expect((await refresh(cookieValue(changed, 'masaha_refresh') ?? '')).status).toBe(200);
  });

  it.each(['USER', 'OWNER', 'ADMIN'] as const)(
    'works for an account whose role is %s',
    async (role) => {
      await createAccount({ role });
      const { accessToken } = await signIn();

      const changed = await changePassword(accessToken, {
        currentPassword: PASSWORD,
        password: NEW_PASSWORD,
      });

      expect(changed.status).toBe(200);
    },
  );
});

describe('POST /me/password: a Google-only account', () => {
  it('sets its first password without a current one', async () => {
    const user = await prisma.user.create({
      data: { email: 'google@example.com', name: 'G', googleSubject: 'g1' },
    });
    const accessToken = await accessTokens.sign({
      userId: user.id,
      role: 'USER',
      mustChangePassword: false,
    });

    const changed = await changePassword(accessToken, { password: NEW_PASSWORD });

    expect(changed.status).toBe(200);
    const renewed = await refresh(cookieValue(changed, 'masaha_refresh') ?? '');
    expect(renewed.body).toMatchObject({ data: { user: { hasPassword: true } } });
    expect((await signIn('google@example.com', NEW_PASSWORD)).accessToken).toBeTruthy();
  });
});

describe('POST /me/password: refusals', () => {
  it('answers 401 without a valid access token', async () => {
    expect((await changePassword(undefined, { password: NEW_PASSWORD })).status).toBe(401);
    expect((await changePassword('not-a-token', { password: NEW_PASSWORD })).status).toBe(401);
  });

  it('refuses a password outside the policy', async () => {
    await createAccount({ mustChangePassword: true });
    const { accessToken } = await signIn();

    const response = await changePassword(accessToken, { password: 'short1' });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: { errors: { password: ['too_short'] } } });
  });

  it('refuses a suspended account whose access token has not expired yet', async () => {
    const user = await createAccount();
    const { accessToken } = await signIn();
    await prisma.user.update({ where: { id: user.id }, data: { suspendedAt: new Date() } });

    const response = await changePassword(accessToken, {
      currentPassword: PASSWORD,
      password: NEW_PASSWORD,
    });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: { code: 'ACCOUNT_SUSPENDED' } });
  });
});
