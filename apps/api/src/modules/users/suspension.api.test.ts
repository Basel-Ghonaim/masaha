import { createHash } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  adminRequest,
  auditEntries,
  errorOf,
  REFUSED_CALLERS,
  signIn,
} from '../../../test/admin.ts';
import { cookieValue, createAccount, createTestApp, PASSWORD } from '../../../test/app.ts';
import { createSpace } from '../../../test/factories.ts';
import { lockUsers, whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../../db/index.ts';

const app = createTestApp();

let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  admin = await signIn('ADMIN');
});

function suspend(userId: number, isSuspended = true, by: { authorization: string } = admin) {
  return adminRequest(app, by, 'put', `/users/${String(userId)}/suspended`, { isSuspended });
}

/** Sara's session, opened by a real sign-in: its access token and its refresh token. */
async function sessionOf(email = 'sara@example.com') {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: PASSWORD });
  const { accessToken } = (response.body as { data: { accessToken: string } }).data;
  return { accessToken, refreshToken: cookieValue(response, 'masaha_refresh') ?? '' };
}

/** A live reset link for the user, as a request for one stores it. */
function resetLink(userId: number) {
  return prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: createHash('sha256').update('link-token').digest('hex'),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    },
  });
}

async function suspendedAt(userId: number) {
  return (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).suspendedAt;
}

function tokensOf(userId: number) {
  return prisma.refreshToken.count({ where: { userId } });
}

describe('PUT /admin/users/:userId/suspended', () => {
  it.each(REFUSED_CALLERS)('refuses a $caller with $status', async ({ caller, ...refusal }) => {
    const user = await createAccount();

    const response = await adminRequest(app, caller, 'put', `/users/${String(user.id)}/suspended`, {
      isSuspended: true,
    });

    expect(response.status).toBe(refusal.status);
    expect(errorOf(response).code).toBe(refusal.code);
    expect(await suspendedAt(user.id)).toBeNull();
  });

  it('suspends an account: every session and reset link ends, and its next request is refused', async () => {
    const user = await createAccount();
    const { accessToken, refreshToken } = await sessionOf();
    await resetLink(user.id);

    const response = await suspend(user.id);

    expect(response.status).toBe(204);
    expect(await suspendedAt(user.id)).toBeInstanceOf(Date);
    expect(await tokensOf(user.id)).toBe(0);
    expect(await prisma.passwordResetToken.count({ where: { userId: user.id } })).toBe(0);
    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'user.suspended',
        entityType: 'user',
        entityId: user.id,
        spaceId: null,
        before: { isSuspended: false },
        after: { isSuspended: true },
      },
    ]);
    // The web's chain: the next request is 401, and the refresh it then tries is refused.
    const next = await request(app)
      .get('/api/v1/manage/spaces')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(next.status).toBe(401);
    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `masaha_refresh=${refreshToken}`);
    expect(refreshed.status).toBe(401);
  });

  it('keeps a suspended owner’s links: the space stays verified', async () => {
    const owner = await createAccount({ role: 'OWNER' });
    const space = await createSpace();
    await prisma.spaceManager.create({
      data: { spaceId: space.id, userId: owner.id, role: 'OWNER' },
    });

    expect((await suspend(owner.id)).status).toBe(204);

    expect(
      await prisma.spaceManager.findMany({
        where: { userId: owner.id },
        select: { role: true, deactivatedAt: true },
      }),
    ).toEqual([{ role: 'OWNER', deactivatedAt: null }]);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).role).toBe('OWNER');
  });

  it('restores an account, which signs in again', async () => {
    const user = await createAccount({ suspendedAt: new Date() });

    const response = await suspend(user.id, false);

    expect(response.status).toBe(204);
    expect(await suspendedAt(user.id)).toBeNull();
    expect(await auditEntries()).toMatchObject([
      {
        action: 'user.unsuspended',
        entityId: user.id,
        before: { isSuspended: true },
        after: { isSuspended: false },
      },
    ]);
    expect((await sessionOf()).accessToken).toBeTruthy();
  });

  it('writes nothing and ends no session when the account is already in that state', async () => {
    const user = await createAccount();
    await sessionOf();
    const suspended = await createAccount({ email: 'nour@example.com', suspendedAt: new Date() });
    const before = await suspendedAt(suspended.id);

    expect((await suspend(user.id, false)).status).toBe(204);
    expect((await suspend(suspended.id, true)).status).toBe(204);

    expect(await tokensOf(user.id)).toBe(1);
    expect(await suspendedAt(suspended.id)).toEqual(before);
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses the admin’s own account, writing nothing', async () => {
    const response = await suspend(admin.id);

    expect(response.status).toBe(409);
    expect(errorOf(response)).toMatchObject({ type: 'conflict', code: 'OWN_ACCOUNT' });
    expect(await suspendedAt(admin.id)).toBeNull();
  });

  it('suspends another admin while one stays active', async () => {
    const other = await signIn('ADMIN', 'other-admin@example.com');

    expect((await suspend(other.id)).status).toBe(204);
    expect(await suspendedAt(other.id)).toBeInstanceOf(Date);
  });

  it.each(['999', 'abc'])('answers 404 for the id %s', async (id) => {
    const response = await adminRequest(app, admin, 'put', `/users/${id}/suspended`, {
      isSuspended: true,
    });

    expect(response.status).toBe(404);
  });

  it('refuses a body without a boolean isSuspended', async () => {
    const user = await createAccount();

    const response = await adminRequest(app, admin, 'put', `/users/${String(user.id)}/suspended`, {
      suspended: true,
    });

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ isSuspended: ['required'] });
  });
});

describe('PUT /admin/users/:userId/suspended: the races', () => {
  it('keeps one of two admins suspending each other at once: the second is the last', async () => {
    const other = await signIn('ADMIN', 'other-admin@example.com');

    // The test suspends `other`, as `admin`'s request would, while `other` suspends `admin`.
    const answer = await whileHeld(
      (tx) => lockUsers(tx, admin.id, other.id),
      () => suspend(admin.id, true, other),
      (tx) => tx.user.update({ where: { id: other.id }, data: { suspendedAt: new Date() } }),
    );

    expect(answer.status).toBe(409);
    expect(errorOf(answer).code).toBe('LAST_ADMIN');
    expect(await suspendedAt(admin.id)).toBeNull();
  }, 20_000);

  it('ends a session a sign-in opened while the suspension waited for the lock', async () => {
    const user = await createAccount();

    const answer = await whileHeld(
      (tx) => lockUsers(tx, user.id),
      () => suspend(user.id),
      (tx) =>
        tx.refreshToken.create({
          data: {
            userId: user.id,
            familyId: 0,
            tokenHash: 'opened-meanwhile',
            expiresAt: new Date(Date.now() + 60_000),
            sessionEndsAt: new Date(Date.now() + 60_000),
          },
        }),
    );

    expect(answer.status).toBe(204);
    expect(await tokensOf(user.id)).toBe(0);
  }, 20_000);

  it('opens no session for a password change that waited on the suspension', async () => {
    const user = await createAccount();
    const { accessToken } = await sessionOf();

    const answer = await whileHeld(
      (tx) => lockUsers(tx, user.id),
      () =>
        request(app)
          .post('/api/v1/me/password')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ currentPassword: PASSWORD, password: 'mine2026x' }),
      async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { suspendedAt: new Date() } });
        await tx.refreshToken.deleteMany({ where: { userId: user.id } });
      },
    );

    expect(answer.status).toBe(403);
    expect(errorOf(answer).code).toBe('ACCOUNT_SUSPENDED');
    expect(await tokensOf(user.id)).toBe(0);
  }, 20_000);
});
