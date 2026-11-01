import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { dataOf, errorOf } from '../../../test/admin.ts';
import { createAccount, createTestApp, PASSWORD } from '../../../test/app.ts';
import { createSpace } from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';
import type { GoogleIdentity } from './google.ts';

// An expired pending account's address is freed when its holder creates an account (finding 91,
// S1): only for an account someone else created, that never acted and owns no space
// (docs/backend/security.md › Passwords).
const EMAIL = 'hala@gmail.com';
const google: GoogleIdentity = {
  verify: (idToken) =>
    Promise.resolve(
      idToken === 'hala'
        ? { subject: 'google-hala', email: EMAIL, name: 'Hala', hostedDomain: undefined }
        : undefined,
    ),
};
const app = createTestApp({ google });

let spaceId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
});

const anHourAgo = () => new Date(Date.now() - 60 * 60_000);

/**
 * An account whose temporary password expired unused: created by its holder, with no
 * `user.created` entry naming it (a registration, then a password the admin issued).
 */
function expiredSelfMade(data: { temporaryPasswordExpiresAt?: Date } = {}) {
  return createAccount({
    email: EMAIL,
    name: 'Hala',
    mustChangePassword: true,
    temporaryPasswordExpiresAt: anHourAgo(),
    ...data,
  });
}

/**
 * An account someone else created (`user.created` naming it, as the admin's owner add writes it),
 * whose temporary password expired unused.
 */
async function expiredPending(data: { temporaryPasswordExpiresAt?: Date } = {}) {
  const admin = await createAccount({ email: 'admin@example.com', name: 'Admin', role: 'ADMIN' });
  const account = await expiredSelfMade(data);
  await prisma.auditLog.create({
    data: { actorId: admin.id, action: 'user.created', entityType: 'user', entityId: account.id },
  });
  return account;
}

function register() {
  return request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Hala', email: EMAIL, password: PASSWORD });
}

describe('an expired pending account replaced by its address holder', () => {
  it('registering an expired pending account’s address replaces it and creates the new one', async () => {
    const old = await expiredPending();

    const response = await register();

    expect(response.status).toBe(201);
    const { user } = dataOf(response) as {
      user: { id: number; email: string; mustChangePassword: boolean };
    };
    expect(user).toMatchObject({ email: EMAIL, mustChangePassword: false });
    expect(user.id).not.toBe(old.id);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: old.id } })).toMatchObject({
      email: `replaced-${String(old.id)}@replaced.invalid`,
    });
  });

  it('the replaced account loses its links and sessions, is suspended, and its email freed', async () => {
    const old = await expiredPending();
    await prisma.spaceManager.create({ data: { spaceId, userId: old.id, role: 'RECEPTION' } });
    await prisma.refreshToken.create({
      data: {
        userId: old.id,
        familyId: 1,
        tokenHash: 'old-session',
        expiresAt: new Date(Date.now() + 60_000),
        sessionEndsAt: new Date(Date.now() + 60_000),
      },
    });

    expect((await register()).status).toBe(201);

    const replaced = await prisma.user.findUniqueOrThrow({ where: { id: old.id } });
    expect(replaced.suspendedAt).not.toBeNull();
    expect(replaced.sessionVersion).toBe(old.sessionVersion + 1);
    expect(replaced.email).toBe(`replaced-${String(old.id)}@replaced.invalid`);
    expect(await prisma.refreshToken.count({ where: { userId: old.id } })).toBe(0);
    expect(
      await prisma.spaceManager.findUniqueOrThrow({
        where: { spaceId_userId: { spaceId, userId: old.id } },
      }),
    ).toMatchObject({ deactivatedAt: expect.any(Date) as unknown });
  });

  it.each([
    [
      'acted (an audit entry as its actor)',
      (userId: number) =>
        prisma.auditLog.create({
          data: {
            actorId: userId,
            action: 'user.profileEdited',
            entityType: 'user',
            entityId: userId,
          },
        }),
    ],
    [
      'saved a favourite',
      (userId: number) => prisma.favorite.create({ data: { userId, spaceId } }),
    ],
    [
      'wrote a data report',
      (userId: number) => prisma.dataReport.create({ data: { userId, spaceId, field: 'PRICES' } }),
    ],
    [
      'owns a space',
      (userId: number) => prisma.spaceManager.create({ data: { spaceId, userId, role: 'OWNER' } }),
    ],
  ])('an account that %s is not replaced', async (_case, footprint) => {
    const old = await expiredPending();
    await footprint(old.id);

    const response = await register();

    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('EMAIL_TAKEN');
    expect(await prisma.user.findUniqueOrThrow({ where: { id: old.id } })).toMatchObject({
      email: EMAIL,
      suspendedAt: null,
    });
    expect(await prisma.user.count({ where: { role: 'USER' } })).toBe(1);
  });

  it('a self-registered account whose admin-issued temporary password expired is not replaced', async () => {
    // Registered by its holder, then recovered through the platform: no one else created it.
    const old = await expiredSelfMade();

    const response = await register();

    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('EMAIL_TAKEN');
    expect(await prisma.user.findUniqueOrThrow({ where: { id: old.id } })).toMatchObject({
      email: EMAIL,
      suspendedAt: null,
    });
    expect(await prisma.user.count()).toBe(1);
  });

  it('a pending account not yet expired is not replaced', async () => {
    const old = await expiredPending({ temporaryPasswordExpiresAt: new Date(Date.now() + 60_000) });

    const response = await register();

    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('EMAIL_TAKEN');
    expect(await prisma.user.findUniqueOrThrow({ where: { id: old.id } })).toMatchObject({
      email: EMAIL,
    });
  });

  it('Google’s first sign-in at such an address replaces it, answering created', async () => {
    const old = await expiredPending();

    const response = await request(app).post('/api/v1/auth/google').send({ idToken: 'hala' });

    expect(response.status).toBe(200);
    const answer = dataOf(response) as { created: boolean; linked: boolean; user: { id: number } };
    expect(answer).toMatchObject({ created: true, linked: false });
    expect(answer.user.id).not.toBe(old.id);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: answer.user.id } })).toMatchObject({
      email: EMAIL,
      googleSubject: 'google-hala',
      passwordHash: null,
    });
    expect(await prisma.user.findUniqueOrThrow({ where: { id: old.id } })).toMatchObject({
      email: `replaced-${String(old.id)}@replaced.invalid`,
    });
  });

  it('the replacement is audited user.replaced, and the space’s log shows the link ended by no one', async () => {
    const old = await expiredPending();
    await prisma.spaceManager.create({ data: { spaceId, userId: old.id, role: 'RECEPTION' } });
    const owner = await signInOwnerOf(spaceId);

    const { user } = dataOf(await register()) as { user: { id: number } };

    expect(
      await prisma.auditLog.findFirstOrThrow({ where: { action: 'user.replaced' } }),
    ).toMatchObject({
      actorId: null,
      entityType: 'user',
      entityId: old.id,
      spaceId: null,
      before: { email: EMAIL },
      after: { replacedById: user.id },
    });
    const log = await request(app)
      .get(`/api/v1/manage/spaces/${String(spaceId)}/audit-log`)
      .set('Authorization', owner.authorization);
    expect(dataOf(log) as { action: string; actor: { kind: string } }[]).toEqual([
      expect.objectContaining({ action: 'space.staffDeactivated', actor: { kind: 'SYSTEM' } }),
    ]);
  });
});
