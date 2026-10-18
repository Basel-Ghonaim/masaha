import type { AddedStaff } from '@masaha/shared/space-links';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { auditEntries, dataOf, errorOf, signIn } from '../../../../test/admin.ts';
import { createTestApp } from '../../../../test/app.ts';
import { createSpace } from '../../../../test/factories.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../../test/spaces.ts';
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
        spaceId: null,
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
