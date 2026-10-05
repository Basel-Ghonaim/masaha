import { beforeEach, describe, expect, it } from 'vitest';

import {
  adminRequest,
  auditEntries,
  dataOf,
  errorOf,
  REFUSED_CALLERS,
  signIn,
} from '../../../../test/admin.ts';
import { createTestApp } from '../../../../test/app.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { prisma } from '../../../db/index.ts';

const app = createTestApp();

beforeEach(async () => {
  await resetDatabase(prisma);
});

function amenity(key: string, nameEn: string, sortOrder: number, data = {}) {
  return prisma.amenity.create({
    data: { key, nameAr: nameEn, nameEn, icon: 'wifi', sortOrder, ...data },
  });
}

/** The amenities' keys, in the order the admin's list gives them. */
async function listedKeys(admin: { authorization: string }) {
  const response = await adminRequest(app, admin, 'get', '/amenities');
  return (dataOf(response) as { key: string }[]).map(({ key }) => key);
}

const meetingRoom = {
  nameAr: 'قاعة اجتماعات',
  nameEn: 'Meeting room',
  icon: 'users',
  isFilterable: true,
};

describe('the amenities endpoints', () => {
  const endpoints = [
    { name: 'GET /amenities', method: 'get', path: () => '/amenities', body: () => undefined },
    { name: 'POST /amenities', method: 'post', path: () => '/amenities', body: () => meetingRoom },
    {
      name: 'PATCH /amenities/:id',
      method: 'patch',
      path: (id: number) => `/amenities/${String(id)}`,
      body: () => ({ isFilterable: false }),
    },
    {
      name: 'PUT /amenities/order',
      method: 'put',
      path: () => '/amenities/order',
      body: (id: number) => ({ ids: [id] }),
    },
  ] as const;
  const statuses = { get: 200, post: 201, patch: 200, put: 204 };

  describe.each(endpoints)('$name', ({ method, path, body }) => {
    async function send(caller: Parameters<typeof adminRequest>[1]) {
      const internet = await amenity('internet', 'Internet', 0);
      return adminRequest(app, caller, method, path(internet.id), body(internet.id));
    }

    it.each(REFUSED_CALLERS)('refuses $caller with $status', async ({ caller, ...refusal }) => {
      const response = await send(caller);

      expect(response.status).toBe(refusal.status);
      const { type, code } = errorOf(response);
      expect({ type, code }).toEqual({ type: refusal.type, code: refusal.code });
      expect(await prisma.amenity.findMany({ select: { key: true, isFilterable: true } })).toEqual([
        { key: 'internet', isFilterable: true },
      ]);
    });

    it(`answers the admin with ${String(statuses[method])}`, async () => {
      expect((await send(await signIn('ADMIN'))).status).toBe(statuses[method]);
    });
  });
});

describe('GET /admin/amenities', () => {
  it('lists every amenity, retired ones included, in order', async () => {
    const admin = await signIn('ADMIN');
    const power = await amenity('stable_power', 'Stable power', 1, {
      icon: 'zap',
      isFilterable: false,
      isActive: false,
    });
    await amenity('internet', 'Internet', 0);

    const response = await adminRequest(app, admin, 'get', '/amenities');

    expect(response.status).toBe(200);
    expect(dataOf(response)).toEqual([
      expect.objectContaining({ key: 'internet' }),
      {
        id: power.id,
        key: 'stable_power',
        nameAr: 'Stable power',
        nameEn: 'Stable power',
        icon: 'zap',
        isActive: false,
        isFilterable: false,
      },
    ]);
  });
});

describe('POST /admin/amenities', () => {
  it('adds an active amenity last, keyed from its English name, and audits it as added', async () => {
    const admin = await signIn('ADMIN');
    await amenity('internet', 'Internet', 6);

    const response = await adminRequest(app, admin, 'post', '/amenities', {
      ...meetingRoom,
      isFilterable: false,
    });

    expect(response.status).toBe(201);
    const { id } = dataOf(response) as { id: number };
    expect(dataOf(response)).toEqual({
      id,
      key: 'meeting_room',
      nameAr: 'قاعة اجتماعات',
      nameEn: 'Meeting room',
      icon: 'users',
      isActive: true,
      isFilterable: false,
    });
    expect(await prisma.amenity.findUnique({ where: { id } })).toMatchObject({ sortOrder: 7 });
    expect(await listedKeys(admin)).toEqual(['internet', 'meeting_room']);
    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'amenity.added',
        entityType: 'amenity',
        entityId: id,
        spaceId: null,
        before: null,
        after: { key: 'meeting_room', ...meetingRoom, isFilterable: false },
      },
    ]);
  });

  it('answers 409 not_unique on the English name when a retired amenity holds its key', async () => {
    const admin = await signIn('ADMIN');
    await amenity('meeting_room', 'Meeting Room', 0, { isActive: false });

    const response = await adminRequest(app, admin, 'post', '/amenities', {
      ...meetingRoom,
      nameEn: 'Meeting-room',
    });

    expect(response.status).toBe(409);
    expect(errorOf(response)).toMatchObject({
      type: 'conflict',
      errors: { nameEn: ['not_unique'] },
    });
    expect(errorOf(response).code).toBeUndefined();
    expect(await prisma.amenity.count()).toBe(1);
    expect(await auditEntries()).toEqual([]);
  });

  it('answers 422 for an English name that yields no key', async () => {
    const admin = await signIn('ADMIN');

    const response = await adminRequest(app, admin, 'post', '/amenities', {
      ...meetingRoom,
      nameEn: 'قاعة',
    });

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ nameEn: ['invalid_format'] });
    expect(await prisma.amenity.count()).toBe(0);
  });

  it('answers 422 for an icon outside the list', async () => {
    const admin = await signIn('ADMIN');

    const response = await adminRequest(app, admin, 'post', '/amenities', {
      ...meetingRoom,
      icon: 'printer',
    });

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ icon: ['invalid_choice'] });
  });
});

describe('PATCH /admin/amenities/:id', () => {
  it('edits it, keeping its key, then retires and restores it, each audited', async () => {
    const admin = await signIn('ADMIN');
    const internet = await amenity('internet', 'Internet', 0);
    const path = `/amenities/${String(internet.id)}`;

    const edited = await adminRequest(app, admin, 'patch', path, {
      nameEn: 'Fast internet',
      icon: 'zap',
      isFilterable: false,
      key: 'fast_internet',
    });
    expect(edited.status).toBe(200);
    expect(dataOf(edited)).toMatchObject({
      key: 'internet',
      nameEn: 'Fast internet',
      icon: 'zap',
      isFilterable: false,
    });

    await adminRequest(app, admin, 'patch', path, { isActive: false });
    await adminRequest(app, admin, 'patch', path, { isActive: true });

    expect(await auditEntries()).toEqual([
      expect.objectContaining({
        actorId: admin.id,
        action: 'amenity.edited',
        entityType: 'amenity',
        entityId: internet.id,
        before: { nameEn: 'Internet', icon: 'wifi', isFilterable: true },
        after: { nameEn: 'Fast internet', icon: 'zap', isFilterable: false },
      }),
      expect.objectContaining({ action: 'amenity.hidden', after: { isActive: false } }),
      expect.objectContaining({ action: 'amenity.restored', after: { isActive: true } }),
    ]);
  });

  it('answers 404 for an unknown amenity', async () => {
    const admin = await signIn('ADMIN');

    const response = await adminRequest(app, admin, 'patch', '/amenities/999', {
      isActive: false,
    });

    expect(response.status).toBe(404);
  });

  it('answers 422 for an icon outside the list', async () => {
    const admin = await signIn('ADMIN');
    const internet = await amenity('internet', 'Internet', 0);

    const response = await adminRequest(app, admin, 'patch', `/amenities/${String(internet.id)}`, {
      icon: 'printer',
    });

    expect(response.status).toBe(422);
  });
});

describe('PUT /admin/amenities/order', () => {
  it('puts the amenities in the order given, and audits nothing', async () => {
    const admin = await signIn('ADMIN');
    const internet = await amenity('internet', 'Internet', 0);
    const power = await amenity('stable_power', 'Stable power', 1);
    const coffee = await amenity('hot_drinks', 'Hot drinks', 2, { isActive: false });

    const response = await adminRequest(app, admin, 'put', '/amenities/order', {
      ids: [coffee.id, internet.id, power.id],
    });

    expect(response.status).toBe(204);
    expect(await listedKeys(admin)).toEqual(['hot_drinks', 'internet', 'stable_power']);
    expect(await auditEntries()).toEqual([]);
  });

  it('answers 409 for a list without a retired amenity, changing nothing', async () => {
    const admin = await signIn('ADMIN');
    const internet = await amenity('internet', 'Internet', 0);
    const power = await amenity('stable_power', 'Stable power', 1);
    await amenity('hot_drinks', 'Hot drinks', 2, { isActive: false });

    const response = await adminRequest(app, admin, 'put', '/amenities/order', {
      ids: [power.id, internet.id],
    });

    expect(response.status).toBe(409);
    expect(await listedKeys(admin)).toEqual(['internet', 'stable_power', 'hot_drinks']);
  });
});
