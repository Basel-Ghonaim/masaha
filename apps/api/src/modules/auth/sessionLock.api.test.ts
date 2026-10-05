import { createHash } from 'node:crypto';

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

/** A live reset link for the user, as the request for one stores it. */
async function resetLink(userId: number, token = 'link-token') {
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    },
  });
  return token;
}

function check(token: string) {
  return request(app)
    .post('/api/v1/auth/password/reset/check')
    .send({ token })
    .then((response) => response);
}

/** What a password change does to the user's links: every one ended. */
async function endLinksMeanwhile(tx: Tx, userId: number) {
  await tx.passwordResetToken.deleteMany({ where: { userId } });
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

  it('keeps a link check waiting on a password change from binding the link it ended', async () => {
    const user = await createAccount();
    const token = await resetLink(user.id);

    const answer = await whileLocked(
      user.id,
      () => check(token),
      (tx) => endLinksMeanwhile(tx, user.id),
    );

    expect(answer.status).toBe(400);
    expect(answer.body).toMatchObject({ error: { code: 'RESET_TOKEN_INVALID' } });
    expect(await prisma.passwordRecovery.count()).toBe(0);
  }, 20_000);

  it('keeps a reset waiting on a password change from using the link it ended', async () => {
    const user = await createAccount();
    const key = cookieValue(await check(await resetLink(user.id)), 'masaha_reset') ?? '';

    const answer = await whileLocked(
      user.id,
      () =>
        request(app)
          .post('/api/v1/auth/password/reset')
          .set('Cookie', `masaha_reset=${key}`)
          .send({ password: 'mine2026x' })
          .then((response) => response),
      async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { passwordHash: 'changed-meanwhile' },
        });
        await endLinksMeanwhile(tx, user.id);
      },
    );

    expect(answer.status).toBe(400);
    expect(answer.body).toMatchObject({ error: { code: 'RECOVERY_INVALID' } });
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.passwordHash).toBe('changed-meanwhile');
  }, 20_000);

  it('answers RESET_TOKEN_INVALID, not a 500, when the link ends while the check binds it', async () => {
    const user = await createAccount();
    const token = await resetLink(user.id);
    // A browser holding a recovery that no link is bound to yet.
    const key =
      cookieValue(
        await request(app)
          .post('/api/v1/auth/password/forgot')
          .send({ email: 'nobody@example.com' })
          .then((response) => response),
        'masaha_reset',
      ) ?? '';
    const recovery = await prisma.passwordRecovery.findFirstOrThrow();

    let answer: Promise<request.Response> | undefined;
    await prisma.$transaction(
      async (tx) => {
        // The check reads the link, then waits to bind it to this recovery: meanwhile the link ends.
        await tx.$queryRaw`SELECT id FROM password_recoveries WHERE id = ${recovery.id} FOR UPDATE`;
        answer = request(app)
          .post('/api/v1/auth/password/reset/check')
          .set('Cookie', `masaha_reset=${key}`)
          .send({ token })
          .then((response) => response);
        await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
        await endLinksMeanwhile(tx, user.id);
      },
      { timeout: 10_000 },
    );

    const response = await answer;
    expect(response?.status).toBe(400);
    expect(response?.body).toMatchObject({ error: { code: 'RESET_TOKEN_INVALID' } });
    expect(await prisma.passwordRecovery.count({ where: { resetTokenId: { not: null } } })).toBe(0);
  }, 20_000);
});
