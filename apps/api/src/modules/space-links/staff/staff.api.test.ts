import type { AddedStaff } from '@masaha/shared/space-links';
import type { IssuedTemporaryPassword } from '@masaha/shared/users';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { auditEntries, dataOf, errorOf, signIn } from '../../../../test/admin.ts';
import { cookieValue, createAccount, createTestApp, PASSWORD } from '../../../../test/app.ts';
import { createSpace } from '../../../../test/factories.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { seedSettings, signInOwnerOf } from '../../../../test/spaces.ts';
import { prisma } from '../../../db/index.ts';

const app = createTestApp();
let spaceId: number;
let otherSpaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };
let stranger: { id: number; authorization: string };
let unrelatedOwner: { id: number; authorization: string };
let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  stranger = await signIn('USER', 'stranger@example.com');
  ({ id: otherSpaceId } = await createSpace('other-space'));
  unrelatedOwner = await signInOwnerOf(otherSpaceId);
  admin = await signIn('ADMIN');
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
});

type Method = 'get' | 'post' | 'patch';

/** The staff route of the space `at`, by default the one under test. */
function staff(
  caller: { authorization: string },
  method: Method,
  suffix = '',
  body?: object,
  at = spaceId,
) {
  const path = `/api/v1/manage/spaces/${String(at)}/staff${suffix}`;
  const call = request(app)[method](path).set('Authorization', caller.authorization);
  return body ? call.send(body) : call;
}

/** Every staff route, each with a body it would refuse, so no case writes anything. */
function routes(): { method: Method; suffix: string; body: object }[] {
  return [
    { method: 'get', suffix: '', body: {} },
    { method: 'post', suffix: '', body: { name: '' } },
    { method: 'patch', suffix: `/${String(reception.id)}`, body: { isActive: 'no' } },
    { method: 'post', suffix: `/${String(reception.id)}/temporary-password`, body: {} },
    {
      method: 'post',
      suffix: `/${String(reception.id)}/temporary-password/handover`,
      body: { channel: 'SMS' },
    },
  ];
}

const staffAccountRows = () =>
  prisma.rateLimit.count({ where: { key: { startsWith: 'staff-account:' } } });

describe("a space's staff: who may reach it", () => {
  it('every staff route answers 404 to a user, another space’s owner and the admin', async () => {
    for (const caller of [stranger, unrelatedOwner, admin]) {
      for (const { method, suffix, body } of routes()) {
        const response = await staff(caller, method, suffix, body);
        expect(response.status).toBe(404);
      }
    }
  });

  it('reception is refused every staff route with 403, before the body is read or counted', async () => {
    for (const { method, suffix, body } of routes()) {
      const response = await staff(reception, method, suffix, body);
      expect(response.status).toBe(403);
      expect(errorOf(response)).toMatchObject({ type: 'forbidden' });
    }
    expect(await staffAccountRows()).toBe(0);
  });
});

describe('POST /manage/spaces/:spaceId/staff', () => {
  it('the owner creates a new reception account with a temporary password answered once', async () => {
    const response = await staff(owner, 'post', '', { name: 'Nour', email: ' Nour@Example.com ' });

    expect(response.status).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    const { userId, temporaryPassword } = dataOf(response) as AddedStaff;
    expect(temporaryPassword).toMatch(/^[A-HJ-NP-Za-km-np-z2-9]{12}$/);
    const account = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(account).toMatchObject({
      email: 'nour@example.com',
      name: 'Nour',
      role: 'USER',
      mustChangePassword: true,
    });
    expect(account.temporaryPasswordExpiresAt).not.toBeNull();
    expect(
      await prisma.spaceManager.findUniqueOrThrow({
        where: { spaceId_userId: { spaceId, userId } },
      }),
    ).toMatchObject({ role: 'RECEPTION', deactivatedAt: null });
    expect(await auditEntries()).toEqual([
      {
        actorId: owner.id,
        action: 'user.created',
        entityType: 'user',
        entityId: userId,
        spaceId,
        before: null,
        after: { name: 'Nour', email: 'nour@example.com', role: 'USER', mustChangePassword: true },
      },
      {
        actorId: owner.id,
        action: 'space.staffAdded',
        entityType: 'space',
        entityId: spaceId,
        spaceId,
        before: null,
        after: { userId },
      },
    ]);
    const signedIn = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nour@example.com', password: temporaryPassword });
    expect(signedIn.status).toBe(200);
    expect(signedIn.body).toMatchObject({ data: { user: { mustChangePassword: true } } });
  });

  it('refuses an email that has an account, linking nothing', async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: stranger.id } });

    const response = await staff(owner, 'post', '', {
      name: 'Someone',
      email: 'stranger@example.com',
    });

    expect(response.status).toBe(409);
    expect(errorOf(response)).toMatchObject({
      type: 'conflict',
      code: 'EMAIL_HAS_ACCOUNT',
      errors: { email: ['not_unique'] },
    });
    expect(await prisma.spaceManager.count({ where: { userId: stranger.id } })).toBe(0);
    expect(await auditEntries()).toEqual([]);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: stranger.id } })).toEqual(before);
  });

  it('the 11th staff-account request of an owner in an hour answers 429, an invalid body counted too', async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      expect((await staff(owner, 'post', '', { name: '' })).status).toBe(422);
    }

    const limited = await staff(owner, 'post', '', { name: '' });

    expect(limited.status).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
    expect(await prisma.user.count()).toBe(5);
  });
});

describe('GET /manage/spaces/:spaceId/staff', () => {
  it('the list answers every reception link, whole and oldest first, with each pending password’s expiry', async () => {
    const expiresAt = new Date('2026-10-25T10:00:00.000Z');
    await prisma.user.update({
      where: { id: reception.id },
      data: { mustChangePassword: true, temporaryPasswordExpiresAt: expiresAt },
    });
    const changed = await prisma.user.create({
      data: { email: 'nour@example.com', name: 'Nour', passwordHash: 'x' },
    });
    const deactivated = await prisma.user.create({
      data: { email: 'omar@example.com', name: 'Omar', passwordHash: 'x' },
    });
    await prisma.spaceManager.create({
      data: { spaceId, userId: changed.id, role: 'RECEPTION' },
    });
    await prisma.spaceManager.create({
      data: { spaceId, userId: deactivated.id, role: 'RECEPTION', deactivatedAt: new Date() },
    });
    await prisma.spaceManager.create({
      data: { spaceId: otherSpaceId, userId: stranger.id, role: 'RECEPTION' },
    });

    const response = await staff(owner, 'get');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [
        {
          userId: reception.id,
          name: 'Sara',
          email: 'reception@example.com',
          isActive: true,
          temporaryPassword: { expiresAt: '2026-10-25T10:00:00.000Z' },
        },
        {
          userId: changed.id,
          name: 'Nour',
          email: 'nour@example.com',
          isActive: true,
          temporaryPassword: null,
        },
        {
          userId: deactivated.id,
          name: 'Omar',
          email: 'omar@example.com',
          isActive: false,
          temporaryPassword: null,
        },
      ],
    });
  });
});

/** A receptionist of the space who signs in with a password: their access token and refresh cookie. */
async function signedInReceptionist(email = 'nour@example.com') {
  const account = await createAccount({ email });
  await prisma.spaceManager.create({ data: { spaceId, userId: account.id, role: 'RECEPTION' } });
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: PASSWORD });
  const { accessToken } = (response.body as { data: { accessToken: string } }).data;
  return {
    id: account.id,
    authorization: `Bearer ${accessToken}`,
    refreshToken: cookieValue(response, 'masaha_refresh') ?? '',
  };
}

/** The receptionist signed in again, after a re-activation. */
async function signInAgain(userId: number) {
  const { email } = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: PASSWORD });
  const { accessToken } = (response.body as { data: { accessToken: string } }).data;
  return { authorization: `Bearer ${accessToken}` };
}

function refresh(refreshToken: string) {
  return request(app).post('/api/v1/auth/refresh').set('Cookie', `masaha_refresh=${refreshToken}`);
}

function readSpace(caller: { authorization: string }) {
  return request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}`)
    .set('Authorization', caller.authorization);
}

const staffChanges = async () =>
  (await auditEntries()).filter(({ action }) => action.startsWith('space.staff'));

describe('PATCH /manage/spaces/:spaceId/staff/:userId', () => {
  // The space's read, which proves a session's reach, needs the platform's settings.
  beforeEach(seedSettings);

  it('deactivating ends the person’s link and every session', async () => {
    const nour = await signedInReceptionist();
    expect((await readSpace(nour)).status).toBe(200);

    const response = await staff(owner, 'patch', `/${String(nour.id)}`, { isActive: false });

    expect(response.status).toBe(200);
    expect(dataOf(response)).toEqual({
      userId: nour.id,
      name: 'Sara',
      email: 'nour@example.com',
      isActive: false,
      temporaryPassword: null,
    });
    expect((await readSpace(nour)).status).toBe(401);
    expect((await refresh(nour.refreshToken)).status).toBe(401);
    expect(await staffChanges()).toEqual([
      {
        actorId: owner.id,
        action: 'space.staffDeactivated',
        entityType: 'space',
        entityId: spaceId,
        spaceId,
        before: { userId: nour.id, isActive: true },
        after: { userId: nour.id, isActive: false },
      },
    ]);
  });

  it('re-activating restores the link, ends nothing, and the same state writes nothing', async () => {
    const nour = await signedInReceptionist();
    await staff(owner, 'patch', `/${String(nour.id)}`, { isActive: false });

    const restored = await staff(owner, 'patch', `/${String(nour.id)}`, { isActive: true });
    const again = await staff(owner, 'patch', `/${String(nour.id)}`, { isActive: true });

    expect(restored.status).toBe(200);
    expect(dataOf(restored)).toMatchObject({ isActive: true });
    expect(again.status).toBe(200);
    const back = await signInAgain(nour.id);
    expect((await readSpace(back)).status).toBe(200);
    expect((await staffChanges()).map(({ action }) => action)).toEqual([
      'space.staffDeactivated',
      'space.staffReactivated',
    ]);

    await staff(owner, 'patch', `/${String(nour.id)}`, { isActive: false });
    await prisma.user.update({ where: { id: nour.id }, data: { suspendedAt: new Date() } });
    const suspended = await staff(owner, 'patch', `/${String(nour.id)}`, { isActive: true });
    expect(suspended.status).toBe(409);
    expect(errorOf(suspended).code).toBe('ACCOUNT_SUSPENDED');
  });

  it('an owner cannot deactivate a co-owner, or anyone without a reception link here', async () => {
    const coOwner = await signInOwnerOf(spaceId);
    const elsewhere = await signIn('USER', 'elsewhere@example.com');
    await prisma.spaceManager.create({
      data: { spaceId: otherSpaceId, userId: elsewhere.id, role: 'RECEPTION' },
    });

    for (const userId of [coOwner.id, stranger.id, elsewhere.id, 999_999]) {
      const response = await staff(owner, 'patch', `/${String(userId)}`, { isActive: false });
      expect(response.status).toBe(404);
    }
    expect(await prisma.spaceManager.count({ where: { deactivatedAt: { not: null } } })).toBe(0);
  });
});

/** A reception account the owner just created, its temporary password still pending. */
async function addedReceptionist(email = 'nour@example.com') {
  const response = await staff(owner, 'post', '', { name: 'Nour', email });
  return dataOf(response) as AddedStaff;
}

function login(email: string, password: string) {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}

/** Changes the temporary password, as the person does at their first sign-in. */
async function changeTemporary(email: string, temporaryPassword: string) {
  const signedIn = await login(email, temporaryPassword);
  const { accessToken } = (signedIn.body as { data: { accessToken: string } }).data;
  const changed = await request(app)
    .post('/api/v1/me/password')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ password: 'mine2026x' });
  expect(changed.status).toBe(200);
}

describe('POST /manage/spaces/:spaceId/staff/:userId/temporary-password', () => {
  it('the owner issues a new temporary password only while one is pending', async () => {
    const added = await addedReceptionist();
    const lapsed = new Date(Date.now() - 60_000);
    await prisma.user.update({
      where: { id: added.userId },
      data: { temporaryPasswordExpiresAt: lapsed },
    });

    const response = await staff(owner, 'post', `/${String(added.userId)}/temporary-password`);

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const { temporaryPassword } = dataOf(response) as IssuedTemporaryPassword;
    expect((await login('nour@example.com', added.temporaryPassword)).body).toMatchObject({
      error: { code: 'INVALID_CREDENTIALS' },
    });
    expect((await login('nour@example.com', temporaryPassword)).status).toBe(200);
    const account = await prisma.user.findUniqueOrThrow({ where: { id: added.userId } });
    expect(account.temporaryPasswordExpiresAt?.getTime()).toBeGreaterThan(Date.now());
    expect((await auditEntries()).at(-1)).toEqual({
      actorId: owner.id,
      action: 'user.temporaryPasswordIssued',
      entityType: 'user',
      entityId: added.userId,
      spaceId,
      before: null,
      after: { mustChangePassword: true },
    });

    await changeTemporary('nour@example.com', temporaryPassword);
    const settled = await staff(owner, 'post', `/${String(added.userId)}/temporary-password`);
    expect(settled.status).toBe(409);
    expect(errorOf(settled).code).toBe('TEMPORARY_PASSWORD_NOT_PENDING');
  });

  it('counts each re-issue under the staff-accounts limit: the 11th request of the hour answers 429', async () => {
    const added = await addedReceptionist();
    const reissue = () => staff(owner, 'post', `/${String(added.userId)}/temporary-password`);
    // The creation was the first of the hour; nine re-issues make ten.
    for (let attempt = 0; attempt < 9; attempt++) expect((await reissue()).status).toBe(200);

    const limited = await reissue();

    expect(limited.status).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
  }, 30_000);
  it('refuses a re-issue for an account that holds anything else', async () => {
    const added = await addedReceptionist();
    await prisma.spaceManager.create({
      data: { spaceId: otherSpaceId, userId: added.userId, role: 'OWNER' },
    });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: added.userId } });

    const response = await staff(owner, 'post', `/${String(added.userId)}/temporary-password`);

    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('ACCOUNT_HAS_LINKS');
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: added.userId } })).passwordHash,
    ).toBe(before.passwordHash);
  });
});

describe('POST /manage/spaces/:spaceId/staff/:userId/temporary-password/handover', () => {
  it('records the owner’s handover only for its own pending staff', async () => {
    const added = await addedReceptionist();
    const elsewhere = await signIn('USER', 'elsewhere@example.com');
    await prisma.spaceManager.create({
      data: { spaceId: otherSpaceId, userId: elsewhere.id, role: 'RECEPTION' },
    });
    await prisma.user.update({
      where: { id: elsewhere.id },
      data: { mustChangePassword: true, temporaryPasswordExpiresAt: new Date(Date.now() + 60_000) },
    });
    const handover = (userId: number, channel = 'IN_PERSON') =>
      staff(owner, 'post', `/${String(userId)}/temporary-password/handover`, { channel });

    const recorded = await handover(added.userId);

    expect(recorded.status).toBe(204);
    expect((await auditEntries()).at(-1)).toEqual({
      actorId: owner.id,
      action: 'user.temporaryPasswordHandedOver',
      entityType: 'user',
      entityId: added.userId,
      spaceId,
      before: null,
      after: { channel: 'IN_PERSON' },
    });
    expect((await handover(elsewhere.id)).status).toBe(404);
    expect((await handover(added.userId, 'SMS')).status).toBe(422);
    await changeTemporary('nour@example.com', added.temporaryPassword);
    const settled = await handover(added.userId);
    expect(settled.status).toBe(409);
    expect(errorOf(settled).code).toBe('TEMPORARY_PASSWORD_NOT_PENDING');
  });
});
