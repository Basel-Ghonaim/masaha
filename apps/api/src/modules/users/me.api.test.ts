import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createTestApp, signAccess } from '../../../test/app.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../../db/index.ts';

// The signed-in user's own account (docs/api/api-contract.md › Me): any signed-in user, their own
// only; the guard's refusals are its own.
const app = createTestApp();

beforeEach(async () => {
  await resetDatabase(prisma);
});

function readMe(authorization?: string, query = '') {
  const call = request(app).get(`/api/v1/me${query}`);
  return authorization ? call.set('Authorization', authorization) : call;
}

function editMe(authorization: string | undefined, body: object) {
  const call = request(app).patch('/api/v1/me').send(body);
  return authorization ? call.set('Authorization', authorization) : call;
}

describe('GET /me', () => {
  it('a user reads their own account', async () => {
    const sara = await signIn('USER');
    const other = await signIn('OWNER');
    await prisma.user.update({ where: { id: other.id }, data: { name: 'Rami', language: 'en' } });

    for (const query of ['', `?userId=${String(other.id)}`, `?id=${String(other.id)}`]) {
      const response = await readMe(sara.authorization, query);

      expect(response.status).toBe(200);
      expect(dataOf(response)).toEqual({
        id: sara.id,
        name: 'Sara',
        email: 'user@example.com',
        language: 'ar',
        role: 'USER',
      });
    }
    expect(dataOf(await readMe(other.authorization))).toEqual({
      id: other.id,
      name: 'Rami',
      email: 'owner@example.com',
      language: 'en',
      role: 'OWNER',
    });
  });
});

describe('PATCH /me', () => {
  it('a user edits their name and language; only what changed is audited; no change writes nothing', async () => {
    const sara = await signIn('USER');
    const other = await signIn('OWNER');

    const renamed = await editMe(sara.authorization, { name: '  سارة أحمد ', language: 'ar' });

    expect(renamed.status).toBe(200);
    expect(dataOf(renamed)).toEqual({
      id: sara.id,
      name: 'سارة أحمد',
      email: 'user@example.com',
      language: 'ar',
      role: 'USER',
    });
    expect(await auditEntries()).toEqual([
      {
        actorId: sara.id,
        action: 'user.profileEdited',
        entityType: 'user',
        entityId: sara.id,
        spaceId: null,
        before: { name: 'Sara' },
        after: { name: 'سارة أحمد' },
      },
    ]);

    const english = await editMe(sara.authorization, { language: 'en' });
    expect(english.status).toBe(200);
    expect(dataOf(english)).toMatchObject({ name: 'سارة أحمد', language: 'en' });

    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: sara.id } });
    for (const body of [{}, { name: 'سارة أحمد' }, { name: 'سارة أحمد', language: 'en' }]) {
      const same = await editMe(sara.authorization, body);
      expect(same.status).toBe(200);
      expect(dataOf(same)).toMatchObject({ name: 'سارة أحمد', language: 'en' });
    }

    expect((await auditEntries()).slice(1)).toEqual([
      {
        actorId: sara.id,
        action: 'user.profileEdited',
        entityType: 'user',
        entityId: sara.id,
        spaceId: null,
        before: { language: 'ar' },
        after: { language: 'en' },
      },
    ]);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: sara.id } })).toEqual(unchanged);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: other.id } })).toMatchObject({
      name: 'Sara',
      language: 'ar',
    });
  });

  it('refuses a name out of bounds and an unknown language, changing nothing', async () => {
    const sara = await signIn('USER');

    for (const [body, field, code] of [
      [{ name: '   ' }, 'name', 'too_short'],
      [{ name: 'x'.repeat(101) }, 'name', 'too_long'],
      [{ language: 'fr' }, 'language', 'invalid_choice'],
    ] as const) {
      const response = await editMe(sara.authorization, body);
      expect(response.status).toBe(422);
      expect(errorOf(response).errors).toEqual({ [field]: [code] });
    }
    expect(await auditEntries()).toEqual([]);
  });
});

describe('/me: the guard', () => {
  it('a guest is 401; a suspended account 401; a pending temporary password 403', async () => {
    const suspended = await signIn('USER', 'suspended@example.com');
    await prisma.user.update({ where: { id: suspended.id }, data: { suspendedAt: new Date() } });
    const pending = await prisma.user.create({
      data: {
        email: 'pending@example.com',
        name: 'Sara',
        passwordHash: 'x',
        mustChangePassword: true,
        temporaryPasswordExpiresAt: new Date(Date.now() + 60 * 60_000),
      },
    });
    const pendingAuthorization = `Bearer ${await signAccess(pending.id, { mustChangePassword: true })}`;

    for (const call of [() => readMe(), () => editMe(undefined, { language: 'en' })]) {
      const response = await call();
      expect(response.status).toBe(401);
      expect(errorOf(response).type).toBe('unauthorized');
    }
    for (const call of [
      () => readMe(suspended.authorization),
      () => editMe(suspended.authorization, { language: 'en' }),
    ]) {
      expect((await call()).status).toBe(401);
    }
    for (const call of [
      () => readMe(pendingAuthorization),
      () => editMe(pendingAuthorization, { language: 'en' }),
    ]) {
      const response = await call();
      expect(response.status).toBe(403);
      expect(errorOf(response).code).toBe('PASSWORD_CHANGE_REQUIRED');
    }
    expect(await auditEntries()).toEqual([]);
    expect(await prisma.user.findMany({ where: { language: 'en' }, select: { id: true } })).toEqual(
      [],
    );
  });
});
