import { createHash } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  cookieValue,
  createAccount,
  createTestApp,
  PASSWORD,
  recordingEmailSender,
  WEB_ORIGIN,
} from '../../../test/app.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../../db/index.ts';

const outbox = recordingEmailSender();
const app = createTestApp({ email: outbox });
const NEW_PASSWORD = 'mine2026x';

beforeEach(async () => {
  await resetDatabase(prisma);
  outbox.sent.length = 0;
});

function forgot(email = 'sara@example.com') {
  return request(app).post('/api/v1/auth/password/forgot').send({ email });
}

function check(token: string) {
  return request(app).post('/api/v1/auth/password/reset/check').send({ token });
}

function reset(token: string, password = NEW_PASSWORD) {
  return request(app).post('/api/v1/auth/password/reset').send({ token, password });
}

function login(password: string) {
  return request(app).post('/api/v1/auth/login').send({ email: 'sara@example.com', password });
}

/** The token in the last reset email's link. */
function lastToken(): string {
  const text = outbox.sent.at(-1)?.text ?? '';
  const match = /\/reset-password#token=([\w-]+)/.exec(text);
  if (!match?.[1]) throw new Error('No reset link was sent');
  return match[1];
}

describe('POST /auth/password/forgot', () => {
  it('emails a reset link, whose token lives in the fragment, and answers 202', async () => {
    await createAccount();

    const response = await forgot('  Sara@Example.com ');

    expect(response.status).toBe(202);
    expect(response.text).toBe('');
    expect(outbox.sent).toHaveLength(1);
    expect(outbox.sent[0]?.to).toBe('sara@example.com');
    expect(outbox.sent[0]?.text).toContain(`${WEB_ORIGIN}/reset-password#token=`);
    expect(await prisma.passwordResetToken.count()).toBe(1);
    expect((await prisma.passwordResetToken.findFirstOrThrow()).tokenHash).not.toBe(lastToken());
  });

  it('answers the same 202, and sends nothing, for an unknown or suspended account', async () => {
    await createAccount({ suspendedAt: new Date() });

    const suspended = await forgot();
    const unknown = await forgot('nobody@example.com');

    for (const response of [suspended, unknown]) {
      expect(response.status).toBe(202);
      expect(response.text).toBe('');
    }
    expect(outbox.sent).toHaveLength(0);
  });

  it('keeps one live link: a new one ends the last', async () => {
    await createAccount();
    await forgot();
    const first = lastToken();
    await forgot();

    expect((await check(first)).status).toBe(400);
    expect((await check(lastToken())).status).toBe(200);
  });

  it('limits requests for one email to 5 every 15 minutes', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      expect((await forgot('nobody@example.com')).status).toBe(202);
    }

    const limited = await forgot('nobody@example.com');

    expect(limited.status).toBe(429);
    expect(limited.headers['ratelimit-policy']).toBe('"password-email";q=5;w=900');
    expect((await forgot('other@example.com')).status).toBe(202);
  });

  it('sends one inbox at most 3 emails an hour, and keeps the last delivered link live', async () => {
    await createAccount();

    for (let attempt = 0; attempt < 4; attempt++) expect((await forgot()).status).toBe(202);

    expect(outbox.sent).toHaveLength(3);
    const third = lastToken();
    expect((await check(third)).status).toBe(200);
    expect((await reset(third)).status).toBe(204);
  });

  it('leaves one live link after two concurrent requests', async () => {
    await createAccount();

    await Promise.all([forgot(), forgot()]);

    expect(outbox.sent).toHaveLength(2);
    expect(await prisma.passwordResetToken.count({ where: { usedAt: null } })).toBe(1);
  });
});

describe('POST /auth/password/reset/check', () => {
  it('names the account of a valid link, without using it or extending it', async () => {
    await createAccount();
    await forgot();
    const before = await prisma.passwordResetToken.findFirstOrThrow();

    const response = await check(lastToken());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { email: 'sara@example.com' } });
    expect(await prisma.passwordResetToken.findFirstOrThrow()).toEqual(before);
  });

  it('answers the same RESET_TOKEN_INVALID for an unknown, expired or used link', async () => {
    const user = await createAccount();
    const sha256 = (token: string) => createHash('sha256').update(token).digest('hex');
    const past = new Date(Date.now() - 1_000);
    const later = new Date(Date.now() + 60_000);
    await prisma.passwordResetToken.createMany({
      data: [
        { userId: user.id, tokenHash: sha256('expired-token'), expiresAt: past },
        { userId: user.id, tokenHash: sha256('used-token'), expiresAt: later, usedAt: past },
      ],
    });

    for (const token of ['unknown-token', 'expired-token', 'used-token']) {
      const response = await check(token);
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: { type: 'bad_request', code: 'RESET_TOKEN_INVALID' },
      });
    }
    // Refused by their state, not by their absence: both rows are still there.
    expect(await prisma.passwordResetToken.count({ where: { userId: user.id } })).toBe(2);
  });

  it('limits one address to 50 password requests every 15 minutes, whatever the email', async () => {
    await forgot('first@example.com');
    await prisma.rateLimit.updateMany({
      where: { key: { startsWith: 'password-address:' } },
      data: { hits: 50 },
    });

    const limited = await forgot('second@example.com');

    expect(limited.status).toBe(429);
    expect(limited.headers['ratelimit-policy']).toBe('"password-address";q=50;w=900');
  });

  it('limits the uses of one link to 5 every 15 minutes', async () => {
    for (let attempt = 0; attempt < 5; attempt++)
      expect((await check('some-token')).status).toBe(400);

    const limited = await check('some-token');

    expect(limited.status).toBe(429);
    expect(limited.headers['ratelimit-policy']).toBe('"password-token";q=5;w=900');
  });
});

describe('POST /auth/password/reset', () => {
  it('sets the new password once, settles a temporary one and ends every session', async () => {
    const user = await createAccount({ mustChangePassword: true });
    const signedIn = await login(PASSWORD);
    await forgot();
    const token = lastToken();

    const response = await reset(token);

    expect(response.status).toBe(204);
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
    const refresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `masaha_refresh=${cookieValue(signedIn, 'masaha_refresh') ?? ''}`);
    expect(refresh.status).toBe(401);
    expect((await login(PASSWORD)).status).toBe(401);
    expect((await login(NEW_PASSWORD)).body).toMatchObject({
      data: { user: { mustChangePassword: false } },
    });
    expect((await reset(token, 'again2026x')).body).toMatchObject({
      error: { code: 'RESET_TOKEN_INVALID' },
    });
  });

  it('lets only one of two concurrent resets with one link through', async () => {
    await createAccount();
    await forgot();
    const token = lastToken();

    const results = await Promise.all([reset(token, 'first2026x'), reset(token, 'second2026x')]);

    expect(results.map(({ status }) => status).sort()).toEqual([204, 400]);
  });

  it('refuses an expired link and a password outside the policy', async () => {
    await createAccount();
    await forgot();
    const token = lastToken();

    const weak = await reset(token, 'short1');
    await prisma.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1) } });
    const expired = await reset(token);

    expect(weak.status).toBe(422);
    expect(expired.body).toMatchObject({ error: { code: 'RESET_TOKEN_INVALID' } });
    expect((await login(PASSWORD)).status).toBe(200);
  });
});
