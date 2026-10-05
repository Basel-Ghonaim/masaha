import { createHash } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  cookieValue,
  createAccount,
  createTestApp,
  PASSWORD,
  recordingEmailSender,
  setCookies,
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

function position(key?: string) {
  const call = request(app).get('/api/v1/auth/password/recovery');
  return key === undefined ? call : call.set('Cookie', `masaha_reset=${key}`);
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

/** The recovery position a request opens, for any address typed as `sara@example.com`. */
const SENT = { step: 'sent', email: 's•••@example.com', resendInSeconds: 60, canResend: true };

describe('POST /auth/password/forgot', () => {
  it('emails a reset link, whose token lives in the fragment, and answers 202 with the position', async () => {
    await createAccount();

    const response = await forgot('  Sara@Example.com ');

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ success: true, data: SENT });
    expect(outbox.sent).toHaveLength(1);
    expect(outbox.sent[0]?.to).toBe('sara@example.com');
    expect(outbox.sent[0]?.text).toContain(`${WEB_ORIGIN}/reset-password#token=`);
    expect(await prisma.passwordResetToken.count()).toBe(1);
    expect((await prisma.passwordResetToken.findFirstOrThrow()).tokenHash).not.toBe(lastToken());
  });

  it('answers byte for byte the same, with a recovery cookie, for a known, a suspended and an unknown address', async () => {
    const user = await createAccount();
    const known = await forgot();
    await prisma.user.update({ where: { id: user.id }, data: { suspendedAt: new Date() } });
    const suspended = await forgot();
    await prisma.user.delete({ where: { id: user.id } });
    const unknown = await forgot();

    expect(new Set([known, suspended, unknown].map(({ text }) => text)).size).toBe(1);
    for (const response of [known, suspended, unknown]) {
      expect(response.status).toBe(202);
      expect(setCookies(response).masaha_reset).toMatch(
        /^masaha_reset=[\w-]{43}; Max-Age=3600; Path=\/api\/v1\/auth\/password; Expires=[^;]+; HttpOnly; SameSite=Strict$/,
      );
    }
    expect(outbox.sent.map(({ to }) => to)).toEqual(['sara@example.com']);
  });

  it('ends the recovery the browser held: its key opens nothing any more', async () => {
    const first = await forgot();
    const firstKey = cookieValue(first, 'masaha_reset') ?? '';

    await request(app)
      .post('/api/v1/auth/password/forgot')
      .set('Cookie', `masaha_reset=${firstKey}`)
      .send({ email: 'sara@example.com' });

    expect((await position(firstKey)).body).toEqual({ success: true, data: { step: 'request' } });
    expect(await prisma.passwordRecovery.count()).toBe(1);
  });

  it('refuses a cross-site request with 403, and opens no recovery', async () => {
    const response = await forgot().set('Sec-Fetch-Site', 'cross-site');

    expect(response.status).toBe(403);
    expect(setCookies(response).masaha_reset).toBeUndefined();
    expect(await prisma.passwordRecovery.count()).toBe(0);
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

describe('GET /auth/password/recovery', () => {
  it('answers request, never 404, without a recovery or with a key that opens none', async () => {
    for (const response of [await position(), await position('unknown-key')]) {
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: { step: 'request' } });
    }
  });

  it('answers sent, with the masked email, the window and whether a resend is allowed', async () => {
    const key = cookieValue(await forgot(), 'masaha_reset');

    expect((await position(key)).body).toEqual({ success: true, data: SENT });
  });

  it('answers request once the recovery has expired', async () => {
    const key = cookieValue(await forgot(), 'masaha_reset');
    await prisma.passwordRecovery.updateMany({ data: { expiresAt: new Date(Date.now() - 1) } });

    expect((await position(key)).body).toEqual({ success: true, data: { step: 'request' } });
  });

  it('refuses a cross-site request with 403', async () => {
    expect((await position().set('Sec-Fetch-Site', 'cross-site')).status).toBe(403);
  });
});

describe('POST /auth/password/resend', () => {
  // The recovery's window is a minute: this app's clock is moved past it.
  let now = Date.now();
  const clocked = createTestApp({ email: outbox, clock: () => new Date(now) });

  beforeEach(() => {
    now = Date.now();
  });

  function forgotOn(email = 'sara@example.com') {
    return request(clocked).post('/api/v1/auth/password/forgot').send({ email });
  }

  function resend(key: string | undefined, body?: object) {
    const call = request(clocked).post('/api/v1/auth/password/resend');
    if (key !== undefined) call.set('Cookie', `masaha_reset=${key}`);
    return body === undefined ? call : call.send(body);
  }

  async function openRecovery(email?: string): Promise<string> {
    return cookieValue(await forgotOn(email), 'masaha_reset') ?? '';
  }

  it('sends another link, with no email, once the window has passed, and starts it again', async () => {
    await createAccount();
    const key = await openRecovery();
    now += 60_000;

    const response = await resend(key);

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ success: true, data: SENT });
    expect(setCookies(response).masaha_reset).toContain('Max-Age=3600');
    expect(outbox.sent.map(({ to }) => to)).toEqual(['sara@example.com', 'sara@example.com']);
    expect((await resend(key)).status).toBe(429);
  });

  it('answers the same for an address with no account, and sends nothing', async () => {
    const key = await openRecovery();
    now += 60_000;

    const response = await resend(key);

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ success: true, data: SENT });
    expect(outbox.sent).toHaveLength(0);
  });

  it('refuses inside the window with 429 and the seconds left in Retry-After', async () => {
    const key = await openRecovery();
    now += 45_000;

    const response = await resend(key);

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('15');
  });

  it('allows 3 resends, then refuses with RESEND_LIMIT_REACHED and says so in the position', async () => {
    const key = await openRecovery();
    for (let ask = 0; ask < 3; ask++) {
      now += 60_000;
      expect((await resend(key)).status).toBe(202);
    }
    now += 60_000;

    const response = await resend(key);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: { code: 'RESEND_LIMIT_REACHED' } });
    expect((await position(key)).body).toMatchObject({ data: { canResend: false } });
  });

  it('lets only one of two concurrent resends at the bound through', async () => {
    const key = await openRecovery();
    await prisma.passwordRecovery.updateMany({ data: { resends: 2 } });
    now += 60_000;

    const results = await Promise.all([resend(key), resend(key)]);

    expect(results.map(({ status }) => status).sort()).toEqual([202, 400]);
    expect((await prisma.passwordRecovery.findFirstOrThrow()).resends).toBe(3);
  });

  it('refuses without a recovery with RECOVERY_INVALID', async () => {
    for (const key of [undefined, 'unknown-key']) {
      const response = await resend(key);
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: { type: 'bad_request', code: 'RECOVERY_INVALID' },
      });
    }
  });

  it('refuses an email in the body with 422', async () => {
    const key = await openRecovery();
    now += 60_000;

    const response = await resend(key, { email: 'other@example.com' });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: { errors: { email: ['invalid_format'] } } });
  });

  it('shares the request’s budget: after 2 requests and 3 resends, a 6th request for the email is refused', async () => {
    await openRecovery();
    const key = await openRecovery();
    for (let ask = 0; ask < 3; ask++) {
      now += 60_000;
      expect((await resend(key)).status).toBe(202);
    }

    const limited = await forgotOn();

    expect(limited.status).toBe(429);
    expect(limited.headers['ratelimit-policy']).toBe('"password-email";q=5;w=900');
  });

  it('refuses a cross-site request with 403', async () => {
    const key = await openRecovery();
    now += 60_000;

    expect((await resend(key).set('Sec-Fetch-Site', 'cross-site')).status).toBe(403);
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
    // The used link goes with the transaction that used it.
    expect(await prisma.passwordResetToken.count({ where: { userId: user.id } })).toBe(0);
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
