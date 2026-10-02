import { createHash } from 'node:crypto';
import { Writable } from 'node:stream';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  accessTokens,
  cookieValue,
  createAccount,
  createTestApp,
  PASSWORD,
  setCookies,
} from '../../../test/app.ts';
import { createSpace } from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../../db/index.ts';
import { createLogger } from '../../shared/http/index.ts';

const app = createTestApp();

// Every test starts from an empty database: each signs its own accounts in.
beforeEach(async () => {
  await resetDatabase(prisma);
});
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

function login(email = 'sara@example.com', password = PASSWORD) {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}

function refresh(token: string | undefined) {
  const call = request(app).post('/api/v1/auth/refresh');
  return token === undefined ? call : call.set('Cookie', `masaha_refresh=${token}`);
}

function refreshTokenOf(response: request.Response): string {
  const token = cookieValue(response, 'masaha_refresh');
  if (!token) throw new Error('The response set no refresh cookie');
  return token;
}

async function familyOf(token: string) {
  const row = await prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: sha256(token) } });
  return row.familyId;
}

describe('POST /auth/register', () => {
  const body = { name: 'Sara', email: 'sara@example.com', password: PASSWORD };

  it('creates a USER and opens a session', async () => {
    const response = await request(app).post('/api/v1/auth/register').send(body);

    expect(response.status).toBe(201);
    const { user, accessToken } = (response.body as { data: { user: object; accessToken: string } })
      .data;
    expect(user).toEqual({
      id: expect.any(Number) as unknown,
      email: 'sara@example.com',
      name: 'Sara',
      role: 'USER',
      language: 'ar',
      mustChangePassword: false,
      hasPassword: true,
      spaces: [],
    });
    expect(await accessTokens.verify(accessToken)).toEqual({
      userId: expect.any(Number) as unknown,
      role: 'USER',
      mustChangePassword: false,
    });
  });

  it('sets the refresh cookie and the session hint as security.md says, and stores only a hash', async () => {
    const response = await request(app).post('/api/v1/auth/register').send(body);

    const cookies = setCookies(response);
    expect(cookies.masaha_refresh).toMatch(
      /^masaha_refresh=[\w-]{43}; Max-Age=604800; Path=\/api\/v1\/auth; Expires=[^;]+; HttpOnly; SameSite=Strict$/,
    );
    expect(cookies.masaha_session).toMatch(
      /^masaha_session=1; Max-Age=604800; Path=\/; Expires=[^;]+; SameSite=Strict$/,
    );
    const token = refreshTokenOf(response);
    expect(await prisma.refreshToken.count({ where: { tokenHash: sha256(token) } })).toBe(1);
    expect(await prisma.refreshToken.count({ where: { tokenHash: token } })).toBe(0);
  });

  it('starts the account in the interface language it is given', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...body, language: 'en' });

    expect(response.body).toMatchObject({ data: { user: { language: 'en' } } });
  });

  it('answers EMAIL_TAKEN for an email that has an account, whatever its case', async () => {
    await createAccount();

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...body, email: '  Sara@Example.COM ' });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      error: { type: 'conflict', code: 'EMAIL_TAKEN', errors: { email: ['not_unique'] } },
    });
  });

  it('refuses a weak password and a name with bidirectional controls', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Sara‮', email: 'sara@example.com', password: 'password' });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      error: { errors: { name: ['invalid_format'], password: ['invalid_format'] } },
    });
  });
});

describe('POST /auth/login', () => {
  it('opens a session with the active space links, oldest first', async () => {
    const user = await createAccount();
    const [older, newer, gone] = await Promise.all([
      createSpace('older'),
      createSpace('newer'),
      createSpace('gone'),
    ]);
    await prisma.spaceManager.create({
      data: {
        spaceId: older.id,
        userId: user.id,
        role: 'RECEPTION',
        createdAt: new Date('2026-01-01'),
      },
    });
    await prisma.spaceManager.create({
      data: {
        spaceId: newer.id,
        userId: user.id,
        role: 'OWNER',
        createdAt: new Date('2026-02-01'),
      },
    });
    await prisma.spaceManager.create({
      data: { spaceId: gone.id, userId: user.id, deactivatedAt: new Date() },
    });

    const response = await login();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      data: {
        user: {
          id: user.id,
          spaces: [
            { spaceId: older.id, role: 'RECEPTION' },
            { spaceId: newer.id, role: 'OWNER' },
          ],
        },
      },
    });
    expect(refreshTokenOf(response)).toBeDefined();
  });

  it('carries a pending temporary password in the user and the token', async () => {
    await createAccount({ mustChangePassword: true });

    const response = await login();

    const { user, accessToken } = (
      response.body as { data: { user: { mustChangePassword: boolean }; accessToken: string } }
    ).data;
    expect(user.mustChangePassword).toBe(true);
    expect(await accessTokens.verify(accessToken)).toMatchObject({ mustChangePassword: true });
  });

  it.each([
    ['a wrong password', 'sara@example.com', 'wrong-pass1'],
    ['an unknown email', 'nobody@example.com', PASSWORD],
    ['a Google-only account', 'google@example.com', PASSWORD],
  ])('answers the same INVALID_CREDENTIALS for %s', async (_case, email, password) => {
    await createAccount();
    await prisma.user.create({
      data: { email: 'google@example.com', name: 'G', googleSubject: 'g1' },
    });

    const response = await login(email, password);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      error: { type: 'unauthorized', code: 'INVALID_CREDENTIALS' },
    });
    expect(setCookies(response)).toEqual({});
  });

  it('shows a suspension only once the password matches', async () => {
    await createAccount({ suspendedAt: new Date() });

    const wrong = await login('sara@example.com', 'wrong-pass1');
    const right = await login();

    expect(wrong.body).toMatchObject({ error: { code: 'INVALID_CREDENTIALS' } });
    expect(right.status).toBe(403);
    expect(right.body).toMatchObject({ error: { type: 'forbidden', code: 'ACCOUNT_SUSPENDED' } });
  });
});

describe('the sign-in limits', () => {
  /** The failures the sign-in limits hold now, by policy. */
  async function signInHits() {
    const rows = await prisma.rateLimit.findMany({ where: { key: { startsWith: 'sign-in' } } });
    return rows.reduce((total, { hits }) => total + hits, 0);
  }

  // A slot is held while its attempt is in flight, so a burst larger than the limit is refused
  // beyond it even when every password is right; up to the limit, all go through.
  it('never count a successful sign-in, even in a burst up to the limit', async () => {
    await createAccount();

    const answers = await Promise.all(Array.from({ length: 10 }, () => login()));
    for (let attempt = 0; attempt < 5; attempt++) expect((await login()).status).toBe(200);

    expect(answers.map(({ status }) => status)).toEqual(Array.from({ length: 10 }, () => 200));
    expect(await signInHits()).toBe(0);
  });

  it('hold in a concurrent burst: 20 wrong passwords at once get ten 401s and ten 429s', async () => {
    await createAccount();

    const answers = await Promise.all(
      Array.from({ length: 20 }, (_, n) => login('sara@example.com', `wrong-pass${String(n)}`)),
    );

    const statuses = answers.map(({ status }) => status);
    expect(statuses.filter((status) => status === 401)).toHaveLength(10);
    expect(statuses.filter((status) => status === 429)).toHaveLength(10);
  });

  it('refuse an account after 10 failures from one address, even with the right password', async () => {
    await createAccount();
    await createAccount({ email: 'omar@example.com' });

    for (let attempt = 0; attempt < 10; attempt++) {
      expect((await login('sara@example.com', 'wrong-pass1')).status).toBe(401);
    }
    const limited = await login();

    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ error: { type: 'rate_limit' } });
    expect(limited.headers['ratelimit-policy']).toBe('"sign-in-account";q=10;w=900');
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect((await login('omar@example.com')).status).toBe(200);
  }, 20_000);

  it('refuse an address after 50 failures, whatever the account', async () => {
    await createAccount({ email: 'omar@example.com' });
    await login('nobody@example.com', 'wrong-pass1');
    await prisma.rateLimit.updateMany({
      where: { key: { startsWith: 'sign-in-address:' } },
      data: { hits: 50 },
    });

    const response = await login('omar@example.com');

    expect(response.status).toBe(429);
    expect(response.headers['ratelimit-policy']).toBe('"sign-in-address";q=50;w=900');
  });

  it('count a refused registration as a failure', async () => {
    await createAccount();

    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Sara', email: 'sara@example.com', password: PASSWORD });

    expect(await prisma.rateLimit.count({ where: { key: { startsWith: 'sign-in' } } })).toBe(2);
  });
});

describe('POST /auth/refresh', () => {
  it('rotates the token and restores the session', async () => {
    const user = await createAccount();
    const token = refreshTokenOf(await login());

    const response = await refresh(token);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ data: { user: { id: user.id, spaces: [] } } });
    const next = refreshTokenOf(response);
    expect(next).not.toBe(token);
    expect(await familyOf(next)).toBe(await familyOf(token));
    const old = await prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: sha256(token) },
    });
    expect(old.rotatedAt).not.toBeNull();
  });

  it('keeps two tabs refreshing together signed in', async () => {
    await createAccount();
    const token = refreshTokenOf(await login());

    const [first, second] = await Promise.all([refresh(token), refresh(token)]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const third = await refresh(token);
    expect(third.status).toBe(200);

    for (const tab of [first, second, third]) {
      expect((await refresh(refreshTokenOf(tab))).status).toBe(200);
    }
  });

  it('ends only that session when a token is reused after the grace window', async () => {
    await createAccount();
    const phone = refreshTokenOf(await login());
    const laptop = refreshTokenOf(await login());
    const rotated = refreshTokenOf(await refresh(phone));
    await prisma.refreshToken.update({
      where: { tokenHash: sha256(phone) },
      data: { rotatedAt: new Date(Date.now() - 31_000) },
    });

    const reused = await refresh(phone);

    expect(reused.status).toBe(401);
    expect(cookieValue(reused, 'masaha_refresh')).toBe('');
    expect(await prisma.refreshToken.count({ where: { familyId: await familyOf(laptop) } })).toBe(
      1,
    );
    expect((await refresh(rotated)).status).toBe(401);
    expect((await refresh(laptop)).status).toBe(200);
  });

  it('answers 401 and clears the cookies without a session', async () => {
    const none = await refresh(undefined);
    const unknown = await refresh('not-a-token');

    for (const response of [none, unknown]) {
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ error: { type: 'unauthorized' } });
      expect(cookieValue(response, 'masaha_refresh')).toBe('');
      expect(cookieValue(response, 'masaha_session')).toBe('');
    }
  });

  it('refuses an expired token', async () => {
    await createAccount();
    const token = refreshTokenOf(await login());
    await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1_000) } });

    expect((await refresh(token)).status).toBe(401);
  });

  it('refuses a suspended account and ends all its sessions', async () => {
    const user = await createAccount();
    const token = refreshTokenOf(await login());
    await login();
    await prisma.user.update({ where: { id: user.id }, data: { suspendedAt: new Date() } });

    const response = await refresh(token);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: { code: 'ACCOUNT_SUSPENDED' } });
    expect(cookieValue(response, 'masaha_refresh')).toBe('');
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
  });

  it('limits refreshes by the user, and keeps the session when limited', async () => {
    await createAccount();
    const token = refreshTokenOf(await login());
    await prisma.rateLimit.upsert({
      where: { key: `refresh:${sha256(String((await prisma.user.findFirstOrThrow()).id))}` },
      create: {
        key: `refresh:${sha256(String((await prisma.user.findFirstOrThrow()).id))}`,
        hits: 30,
        resetAt: new Date(Date.now() + 60_000),
      },
      update: {},
    });

    const response = await refresh(token);

    expect(response.status).toBe(429);
    expect(response.headers['ratelimit-policy']).toBe('"refresh";q=30;w=900');
    expect(setCookies(response)).toEqual({});
  });
});

describe('POST /auth/logout', () => {
  it('ends the whole session of the device, grace tokens included, and clears the cookies', async () => {
    await createAccount();
    const token = refreshTokenOf(await login());
    const other = refreshTokenOf(await login());
    const [first] = await Promise.all([refresh(token), refresh(token)]);
    const family = await familyOf(token);

    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `masaha_refresh=${refreshTokenOf(first)}`);

    expect(response.status).toBe(204);
    expect(cookieValue(response, 'masaha_refresh')).toBe('');
    expect(cookieValue(response, 'masaha_session')).toBe('');
    expect(await prisma.refreshToken.count({ where: { familyId: family } })).toBe(0);
    expect((await refresh(other)).status).toBe(200);
  });

  it('answers 204 without a session', async () => {
    expect((await request(app).post('/api/v1/auth/logout')).status).toBe(204);
  });
});

describe('the general limit, signed in', () => {
  it('counts a signed-in request by its user', async () => {
    await createAccount();
    const { accessToken } = ((await login()).body as { data: { accessToken: string } }).data;

    await request(app).get('/api/v1/anything').set('Authorization', `Bearer ${accessToken}`);

    expect(await prisma.rateLimit.count({ where: { key: { startsWith: 'general-user:' } } })).toBe(
      1,
    );
  });
});

describe('the request log of a sign-in', () => {
  it('holds no password, token or cookie', async () => {
    const lines: string[] = [];
    const logged = createTestApp({
      logger: createLogger(
        'trace',
        new Writable({
          write(chunk: Buffer, _encoding, done) {
            lines.push(chunk.toString());
            done();
          },
        }),
      ),
    });
    await createAccount();

    const signedIn = await request(logged)
      .post('/api/v1/auth/login')
      .send({ email: 'sara@example.com', password: PASSWORD });
    const token = refreshTokenOf(signedIn);
    const { accessToken } = (signedIn.body as { data: { accessToken: string } }).data;
    await request(logged)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `masaha_refresh=${token}`)
      .set('Authorization', `Bearer ${accessToken}`);

    const log = lines.join('\n');
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const secret of [PASSWORD, token, accessToken]) expect(log).not.toContain(secret);
  });
});
