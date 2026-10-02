import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { cookieValue, createAccount, createTestApp, PASSWORD } from '../../../test/app.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma, type Tx } from '../../db/index.ts';

// Every transaction that writes a user's refresh tokens takes the user's row first (conventions
// §13). Each test holds that row in its own transaction, as a reset or a password change would,
// while a request runs; the request must then see what the transaction committed.

const app = createTestApp();

beforeEach(async () => {
  await resetDatabase(prisma);
});

/** Long enough for a request to finish its bcrypt work and wait on the lock. */
const WAIT_MS = 2_000;

/**
 * Starts `call` while the user's row is locked, runs `meanwhile` in that transaction, commits, then
 * returns the request's answer.
 */
async function whileLocked(
  userId: number,
  call: () => Promise<request.Response>,
  meanwhile: (tx: Tx) => Promise<unknown>,
): Promise<request.Response> {
  let answer: Promise<request.Response> | undefined;
  await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      answer = call();
      await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
      await meanwhile(tx);
    },
    { timeout: 10_000 },
  );
  if (!answer) throw new Error('The request never started');
  return answer;
}

function login() {
  return request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'sara@example.com', password: PASSWORD })
    .then((response) => response);
}

function refresh(token: string) {
  return request(app)
    .post('/api/v1/auth/refresh')
    .set('Cookie', `masaha_refresh=${token}`)
    .then((response) => response);
}

async function signIn() {
  const response = await login();
  const { accessToken } = (response.body as { data: { accessToken: string } }).data;
  return { accessToken, refreshToken: cookieValue(response, 'masaha_refresh') ?? '' };
}

/** What a reset does to the account: a new password, and every session ended. */
async function resetMeanwhile(tx: Tx, userId: number) {
  await tx.user.update({ where: { id: userId }, data: { passwordHash: 'reset-meanwhile' } });
  await tx.refreshToken.deleteMany({ where: { userId } });
}

describe('the session lock', () => {
  it('keeps a login whose password was checked before a reset from opening a session', async () => {
    const user = await createAccount();

    const answer = await whileLocked(user.id, login, (tx) => resetMeanwhile(tx, user.id));

    expect(answer.status).toBe(401);
    expect(answer.body).toMatchObject({ error: { code: 'INVALID_CREDENTIALS' } });
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
  }, 20_000);

  it('keeps a refresh waiting on a revocation from renewing the session', async () => {
    const user = await createAccount();
    const { refreshToken } = await signIn();

    const answer = await whileLocked(
      user.id,
      () => refresh(refreshToken),
      (tx) => resetMeanwhile(tx, user.id),
    );

    expect(answer.status).toBe(401);
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
  }, 20_000);

  it('leaves no live token when a logout and a refresh of one session race', async () => {
    const user = await createAccount();
    const { refreshToken } = await signIn();
    const family = (await prisma.refreshToken.findFirstOrThrow({ where: { userId: user.id } }))
      .familyId;

    let loggedOut: Promise<request.Response> | undefined;
    const refreshed = await whileLocked(
      user.id,
      () => {
        loggedOut = request(app)
          .post('/api/v1/auth/logout')
          .set('Cookie', `masaha_refresh=${refreshToken}`)
          .then((response) => response);
        return refresh(refreshToken);
      },
      () => Promise.resolve(),
    );

    expect([200, 401]).toContain(refreshed.status);
    expect((await loggedOut)?.status).toBe(204);
    expect(await prisma.refreshToken.count({ where: { familyId: family } })).toBe(0);
  }, 20_000);

  it('never lets a password change overwrite a reset that landed meanwhile', async () => {
    const user = await createAccount();
    const { accessToken } = await signIn();

    const answer = await whileLocked(
      user.id,
      () =>
        request(app)
          .post('/api/v1/me/password')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ currentPassword: PASSWORD, password: 'mine2026x' })
          .then((response) => response),
      (tx) => resetMeanwhile(tx, user.id),
    );

    expect(answer.status).toBe(400);
    expect(answer.body).toMatchObject({ error: { code: 'CURRENT_PASSWORD_INCORRECT' } });
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.passwordHash).toBe('reset-meanwhile');
  }, 20_000);
});
