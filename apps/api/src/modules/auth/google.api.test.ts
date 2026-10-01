import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { accessTokens, cookieValue, createAccount, createTestApp } from '../../../test/app.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../../db/index.ts';
import type { GoogleIdentity, GoogleProfile } from './google.ts';

// Google's verification is unit-tested (google.unit.test.ts). Here a fake port answers for a few
// known ID tokens, so the endpoint and its account rules run on the real database.
const PROFILES: Record<string, GoogleProfile> = {
  sara: { subject: 'google-sara', email: 'sara@example.com', name: 'Sara Google' },
  newcomer: { subject: 'google-new', email: 'new@example.com', name: 'Omar‮' },
};
const google: GoogleIdentity = { verify: (idToken) => Promise.resolve(PROFILES[idToken]) };
const app = createTestApp({ google });

beforeEach(async () => {
  await resetDatabase(prisma);
});

function signInWithGoogle(idToken: string, target = app) {
  return request(target).post('/api/v1/auth/google').send({ idToken, language: 'en' });
}

describe('POST /auth/google', () => {
  it('creates a USER without a password for an unknown email', async () => {
    const response = await signInWithGoogle('newcomer');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      data: {
        linked: false,
        user: {
          email: 'new@example.com',
          name: 'new',
          role: 'USER',
          language: 'en',
          hasPassword: false,
          spaces: [],
        },
      },
    });
    expect(cookieValue(response, 'masaha_refresh')).toBeTruthy();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'new@example.com' } });
    expect(user).toMatchObject({ googleSubject: 'google-new', passwordHash: null });
  });

  it('links Google to the account with the same verified email, and says so', async () => {
    const existing = await createAccount();

    const first = await signInWithGoogle('sara');
    const again = await signInWithGoogle('sara');

    expect(first.body).toMatchObject({
      data: { linked: true, user: { id: existing.id, name: 'Sara', hasPassword: true } },
    });
    expect(again.body).toMatchObject({ data: { linked: false, user: { id: existing.id } } });
    expect(await prisma.user.count()).toBe(1);
  });

  it('keeps a pending temporary password pending', async () => {
    await createAccount({ mustChangePassword: true });

    const response = await signInWithGoogle('sara');

    const { accessToken } = (response.body as { data: { accessToken: string } }).data;
    expect(await accessTokens.verify(accessToken)).toMatchObject({ mustChangePassword: true });
  });

  it('never replaces another Google account already linked to the email', async () => {
    await createAccount({ googleSubject: 'google-other' });

    const response = await signInWithGoogle('sara');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: { code: 'GOOGLE_TOKEN_INVALID' } });
  });

  it('answers GOOGLE_TOKEN_INVALID for a token Google does not vouch for, counted by address', async () => {
    const response = await signInWithGoogle('forged');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      error: { type: 'unauthorized', code: 'GOOGLE_TOKEN_INVALID' },
    });
    const signInKeys = await prisma.rateLimit.findMany({
      where: { key: { startsWith: 'sign-in' } },
    });
    expect(signInKeys.map(({ key }) => key.split(':')[0])).toEqual(['sign-in-address']);
  });

  it('refuses a suspended account', async () => {
    await createAccount({ googleSubject: 'google-sara', suspendedAt: new Date() });

    const response = await signInWithGoogle('sara');

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: { code: 'ACCOUNT_SUSPENDED' } });
  });

  it('answers service_unavailable while no Google client id is configured', async () => {
    const response = await signInWithGoogle('sara', createTestApp());

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ error: { type: 'service_unavailable' } });
  });

  it('refuses a request without an ID token', async () => {
    const response = await request(app).post('/api/v1/auth/google').send({});

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: { errors: { idToken: ['required'] } } });
  });
});
