import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { errorOf } from '../../../test/admin.ts';
import { accessTokens, createAccount, createTestApp, PASSWORD } from '../../../test/app.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../../db/index.ts';

// requireAuth reads the account on every signed-in request (ADR 0003, revised): what the admin
// changes on an account holds from that account's next request, whatever its token says.

const app = createTestApp();

beforeEach(async () => {
  await resetDatabase(prisma);
});

/** An access token for the account, signed before the change each test makes. */
async function tokenFor(userId: number, mustChangePassword = false) {
  return `Bearer ${await accessTokens.sign({ userId, mustChangePassword, sessionVersion: 0 })}`;
}

function get(path: string, authorization: string) {
  return request(app).get(`/api/v1${path}`).set('Authorization', authorization);
}

function changePassword(authorization: string) {
  return request(app)
    .post('/api/v1/me/password')
    .set('Authorization', authorization)
    .send({ currentPassword: PASSWORD, password: 'mine2026x' });
}

describe('requireAuth: the account now', () => {
  it('refuses a suspended account’s unexpired token with 401, everywhere', async () => {
    const admin = await createAccount({ role: 'ADMIN' });
    const authorization = await tokenFor(admin.id);
    expect((await get('/admin/users', authorization)).status).toBe(200);

    await prisma.user.update({ where: { id: admin.id }, data: { suspendedAt: new Date() } });

    for (const response of [
      await get('/manage/spaces', authorization),
      await get('/admin/users', authorization),
      await changePassword(authorization),
    ]) {
      expect(response.status).toBe(401);
      expect(errorOf(response)).toMatchObject({ type: 'unauthorized' });
      expect(errorOf(response).code).toBeUndefined();
    }
  });

  it('lets a user made an admin through /admin with the token signed before', async () => {
    const user = await createAccount();
    const authorization = await tokenFor(user.id);
    expect((await get('/admin/users', authorization)).status).toBe(403);

    await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });

    expect((await get('/admin/users', authorization)).status).toBe(200);
  });

  it('refuses an admin made a user at /admin, with the token signed before', async () => {
    const admin = await createAccount({ role: 'ADMIN' });
    const authorization = await tokenFor(admin.id);
    expect((await get('/admin/users', authorization)).status).toBe(200);

    await prisma.user.update({ where: { id: admin.id }, data: { role: 'USER' } });

    const response = await get('/admin/users', authorization);
    expect(response.status).toBe(403);
    expect(errorOf(response)).toMatchObject({ type: 'forbidden' });
  });

  it('refuses a token signed before a temporary password with 401, the change included', async () => {
    const user = await createAccount();
    const authorization = await tokenFor(user.id);
    expect((await get('/manage/spaces', authorization)).status).toBe(200);

    // As the admin's temporary password leaves the account: another password, to change first.
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: 'temporary-hash', mustChangePassword: true },
    });

    for (const response of [
      await get('/manage/spaces', authorization),
      await changePassword(authorization),
    ]) {
      expect(response.status).toBe(401);
      expect(errorOf(response)).toMatchObject({ type: 'unauthorized' });
      expect(errorOf(response).code).toBeUndefined();
    }
  });

  it('holds a token signed while a change was pending to the change alone', async () => {
    const user = await createAccount({ mustChangePassword: true });
    const authorization = await tokenFor(user.id, true);

    const refused = await get('/manage/spaces', authorization);
    expect(refused.status).toBe(403);
    expect(errorOf(refused).code).toBe('PASSWORD_CHANGE_REQUIRED');
    const changed = await request(app)
      .post('/api/v1/me/password')
      .set('Authorization', authorization)
      .send({ password: 'mine2026x' });
    expect(changed.status).toBe(200);
  });

  it('refuses a token whose account does not exist with 401', async () => {
    const response = await get('/manage/spaces', await tokenFor(404_404));

    expect(response.status).toBe(401);
    expect(errorOf(response)).toMatchObject({ type: 'unauthorized' });
  });
});
