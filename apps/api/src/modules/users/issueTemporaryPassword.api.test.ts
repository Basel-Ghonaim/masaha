import { createHash } from 'node:crypto';
import { Writable } from 'node:stream';

import type { IssuedTemporaryPassword } from '@masaha/shared/users';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  adminRequest,
  auditEntries,
  dataOf,
  errorOf,
  REFUSED_CALLERS,
  signIn,
} from '../../../test/admin.ts';
import { createAccount, createTestApp, PASSWORD } from '../../../test/app.ts';
import { lockUsers, whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../../db/index.ts';
import { createLogger } from '../../shared/http/index.ts';

const app = createTestApp();

let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  admin = await signIn('ADMIN');
});

function issue(userId: number, on = app) {
  return adminRequest(on, admin, 'post', `/users/${String(userId)}/temporary-password`);
}

function issued(response: request.Response): string {
  return (dataOf(response) as IssuedTemporaryPassword).temporaryPassword;
}

function login(password: string, email = 'sara@example.com') {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}

/** A session row for the user, as a sign-in leaves one. */
function session(userId: number, tokenHash = `session-${String(userId)}`) {
  return prisma.refreshToken.create({
    data: {
      userId,
      familyId: 0,
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      sessionEndsAt: new Date(Date.now() + 60_000),
    },
  });
}

function stored(userId: number) {
  return prisma.user.findUniqueOrThrow({ where: { id: userId } });
}

describe('POST /admin/users/:userId/temporary-password', () => {
  it.each(REFUSED_CALLERS)('refuses a $caller with $status', async ({ caller, ...refusal }) => {
    const user = await createAccount();

    const response = await adminRequest(
      app,
      caller,
      'post',
      `/users/${String(user.id)}/temporary-password`,
    );

    expect(response.status).toBe(refusal.status);
    expect(errorOf(response).code).toBe(refusal.code);
    expect((await stored(user.id)).mustChangePassword).toBe(false);
  });

  it('issues a temporary password, answered once, ending every session and reset link', async () => {
    const user = await createAccount();
    await session(user.id);
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash('sha256').update('link-token').digest('hex'),
        expiresAt: new Date(Date.now() + 60 * 60_000),
      },
    });

    const response = await issue(user.id);

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const temporaryPassword = issued(response);
    expect(temporaryPassword).toMatch(/^[A-HJ-NP-Za-km-np-z2-9]{12}$/);
    const account = await stored(user.id);
    expect(account.mustChangePassword).toBe(true);
    expect(await bcrypt.compare(temporaryPassword, account.passwordHash ?? '')).toBe(true);
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.passwordResetToken.count({ where: { userId: user.id } })).toBe(0);
    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'user.temporaryPasswordIssued',
        entityType: 'user',
        entityId: user.id,
        spaceId: null,
        before: null,
        after: { mustChangePassword: true },
      },
    ]);
  });

  it('opens a session that must change the password, and takes the handover', async () => {
    const user = await createAccount();
    const temporaryPassword = issued(await issue(user.id));

    expect((await login(PASSWORD)).status).toBe(401);
    const signedIn = await login(temporaryPassword);
    expect(signedIn.status).toBe(200);
    expect(signedIn.body).toMatchObject({ data: { user: { mustChangePassword: true } } });
    const { accessToken } = (signedIn.body as { data: { accessToken: string } }).data;
    const refused = await request(app)
      .get('/api/v1/manage/spaces')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(errorOf(refused).code).toBe('PASSWORD_CHANGE_REQUIRED');

    const handover = await adminRequest(
      app,
      admin,
      'post',
      `/users/${String(user.id)}/temporary-password/handover`,
      { channel: 'WHATSAPP' },
    );
    expect(handover.status).toBe(204);
  });

  it('refuses the access tokens signed before it', async () => {
    const user = await signIn('USER', 'nour@example.com');
    expect((await adminRequest(app, user, 'get', '/users')).status).toBe(403);

    expect((await issue(user.id)).status).toBe(200);

    expect((await adminRequest(app, user, 'get', '/users')).status).toBe(401);
  });

  it('replaces a pending temporary password when issued again (finding 49)', async () => {
    const user = await createAccount();
    const first = issued(await issue(user.id));

    const second = issued(await issue(user.id));

    expect(second).not.toBe(first);
    expect((await login(first)).status).toBe(401);
    expect((await login(second)).status).toBe(200);
  });

  it('issues one to an account with Google and a password, and to another admin', async () => {
    const both = await createAccount({ googleSubject: 'g-sara' });
    const other = await createAccount({ email: 'other-admin@example.com', role: 'ADMIN' });

    expect((await issue(both.id)).status).toBe(200);
    expect((await issue(other.id)).status).toBe(200);
    expect((await stored(other.id)).mustChangePassword).toBe(true);
  });

  it('writes the temporary password in no log line and no audit entry', async () => {
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
    const user = await createAccount();

    const temporaryPassword = issued(await issue(user.id, logged));

    expect(temporaryPassword).toEqual(expect.any(String));
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join('')).not.toContain(temporaryPassword);
    expect(JSON.stringify(await auditEntries())).not.toContain(temporaryPassword);
  });

  it.each([
    ['the admin’s own account', 'OWN_ACCOUNT', () => Promise.resolve({ id: admin.id })],
    ['a suspended account', 'ACCOUNT_SUSPENDED', () => createAccount({ suspendedAt: new Date() })],
    [
      'a Google-only account',
      'GOOGLE_ONLY_ACCOUNT',
      () =>
        prisma.user.create({
          data: { email: 'google@example.com', name: 'G', googleSubject: 'g-only' },
        }),
    ],
  ])('refuses %s, writing nothing', async (_case, code, account) => {
    const { id } = await account();
    const before = await stored(id);

    const response = await issue(id);

    expect(response.status).toBe(409);
    expect(errorOf(response)).toMatchObject({ type: 'conflict', code });
    expect(await stored(id)).toEqual(before);
    expect(await auditEntries()).toEqual([]);
  });

  it.each(['999', 'abc'])('answers 404 for the id %s', async (id) => {
    const response = await adminRequest(app, admin, 'post', `/users/${id}/temporary-password`);

    expect(response.status).toBe(404);
  });
});

describe('POST /admin/users/:userId/temporary-password: the races', () => {
  it('refuses an account suspended while the issue waited for the lock', async () => {
    const user = await createAccount();

    const answer = await whileHeld(
      (tx) => lockUsers(tx, user.id),
      () => issue(user.id),
      (tx) => tx.user.update({ where: { id: user.id }, data: { suspendedAt: new Date() } }),
    );

    expect(answer.status).toBe(409);
    expect(errorOf(answer).code).toBe('ACCOUNT_SUSPENDED');
    expect((await stored(user.id)).mustChangePassword).toBe(false);
  }, 20_000);

  it('ends a session a password change opened while the issue waited for the lock', async () => {
    const user = await createAccount();

    // The test changes the password and opens a session, as a change holding the lock would.
    const answer = await whileHeld(
      (tx) => lockUsers(tx, user.id),
      () => issue(user.id),
      async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { passwordHash: 'changed' } });
        await tx.refreshToken.create({
          data: {
            userId: user.id,
            familyId: 0,
            tokenHash: 'opened-meanwhile',
            expiresAt: new Date(Date.now() + 60_000),
            sessionEndsAt: new Date(Date.now() + 60_000),
          },
        });
      },
    );

    expect(answer.status).toBe(200);
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
    const account = await stored(user.id);
    expect(await bcrypt.compare(issued(answer), account.passwordHash ?? '')).toBe(true);
    expect(account.mustChangePassword).toBe(true);
  }, 20_000);
});
