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
import { prisma } from '../../db/index.ts';
import type { GoogleIdentity, GoogleProfile } from './google.ts';

// Google's verification is unit-tested (google.unit.test.ts). Here a fake port answers for a few
// known ID tokens, so the endpoint and its account rules run on the real database.
const PROFILES: Record<string, GoogleProfile> = {
  gmail: {
    subject: 'google-sara',
    email: 'sara@gmail.com',
    name: 'Sara Google',
    hostedDomain: undefined,
  },
  workspace: {
    subject: 'google-work',
    email: 'sara@masaha.ps',
    name: 'Sara',
    hostedDomain: 'masaha.ps',
  },
  elsewhere: {
    subject: 'google-elsewhere',
    email: 'sara@example.com',
    name: 'Sara',
    hostedDomain: undefined,
  },
  newcomer: {
    subject: 'google-new',
    email: 'new@example.com',
    name: 'Omar‮',
    hostedDomain: undefined,
  },
};
const google: GoogleIdentity = { verify: (idToken) => Promise.resolve(PROFILES[idToken]) };
const app = createTestApp({ google });

beforeEach(async () => {
  await resetDatabase(prisma);
});

function signInWithGoogle(idToken: string, target = app) {
  return request(target).post('/api/v1/auth/google').send({ idToken, language: 'en' });
}

function login(email: string) {
  return request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
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

  it('creates one account when two first sign-ins race', async () => {
    const answers = await Promise.all([signInWithGoogle('newcomer'), signInWithGoogle('newcomer')]);

    expect(answers.map(({ status }) => status)).toEqual([200, 200]);
    expect(await prisma.user.count()).toBe(1);
  });

  it.each([
    ['a Gmail address', 'gmail', 'sara@gmail.com'],
    ['an address of the Workspace domain the token names', 'workspace', 'sara@masaha.ps'],
  ])(
    'links Google to the account of %s, removes its password and ends its sessions',
    async (_case, idToken, email) => {
      const existing = await createAccount({ email, mustChangePassword: true });
      const before = cookieValue(await login(email), 'masaha_refresh') ?? '';

      const first = await signInWithGoogle(idToken);
      const again = await signInWithGoogle(idToken);

      expect(first.body).toMatchObject({
        data: {
          linked: true,
          user: { id: existing.id, hasPassword: false, mustChangePassword: false },
        },
      });
      expect(again.body).toMatchObject({ data: { linked: false, user: { id: existing.id } } });
      const refreshed = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `masaha_refresh=${before}`);
      expect(refreshed.status).toBe(401);
      expect((await login(email)).status).toBe(401);
      expect(await prisma.user.count()).toBe(1);
    },
    20_000,
  );

  it('refuses to link where Google is not the authority for the address', async () => {
    const existing = await createAccount({ email: 'sara@example.com' });

    const response = await signInWithGoogle('elsewhere');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      error: { type: 'conflict', code: 'GOOGLE_LINK_NOT_ALLOWED' },
    });
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: existing.id } });
    expect(stored.googleSubject).toBeNull();
    expect(stored.passwordHash).not.toBeNull();
  });

  it('keeps a pending temporary password pending on an account Google already opens', async () => {
    await createAccount({
      email: 'sara@gmail.com',
      googleSubject: 'google-sara',
      mustChangePassword: true,
    });

    const response = await signInWithGoogle('gmail');

    const { accessToken } = (response.body as { data: { accessToken: string } }).data;
    expect(await accessTokens.verify(accessToken)).toMatchObject({ mustChangePassword: true });
  });

  it('never replaces another Google account already linked to the email', async () => {
    await createAccount({ email: 'sara@gmail.com', googleSubject: 'google-other' });

    const response = await signInWithGoogle('gmail');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: { code: 'GOOGLE_TOKEN_INVALID' } });
  });

  it('answers GOOGLE_TOKEN_INVALID for a token Google does not vouch for', async () => {
    const response = await signInWithGoogle('forged');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      error: { type: 'unauthorized', code: 'GOOGLE_TOKEN_INVALID' },
    });
  });

  it('locks only Google sign-in out after 50 failed tokens from one address', async () => {
    await createAccount({ email: 'sara@example.com' });
    await signInWithGoogle('forged');
    await prisma.rateLimit.updateMany({
      where: { key: { startsWith: 'google-address:' } },
      data: { hits: 50 },
    });

    const google = await signInWithGoogle('forged');

    expect(google.status).toBe(429);
    expect(google.headers['ratelimit-policy']).toBe('"google-address";q=50;w=900');
    expect((await login('sara@example.com')).status).toBe(200);
    const signIn = await prisma.rateLimit.findMany({ where: { key: { startsWith: 'sign-in' } } });
    expect(signIn.every(({ hits }) => hits === 0)).toBe(true);
  });

  it.each([
    ['an account Google opens', { googleSubject: 'google-sara' }],
    ['an account Google would link', {}],
  ])('refuses a suspended account: %s', async (_case, data) => {
    await createAccount({ email: 'sara@gmail.com', suspendedAt: new Date(), ...data });

    const response = await signInWithGoogle('gmail');

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: { code: 'ACCOUNT_SUSPENDED' } });
    expect(await prisma.refreshToken.count()).toBe(0);
  });

  it('answers service_unavailable while no Google client id is configured', async () => {
    const response = await signInWithGoogle('gmail', createTestApp());

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ error: { type: 'service_unavailable' } });
  });

  it('refuses a request without an ID token', async () => {
    const response = await request(app).post('/api/v1/auth/google').send({});

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: { errors: { idToken: ['required'] } } });
  });
});
