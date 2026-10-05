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

function governorate(nameAr: string, nameEn: string, sortOrder: number, isActive = true) {
  return prisma.governorate.create({ data: { nameAr, nameEn, sortOrder, isActive } });
}

/** The governorates' Arabic names, in the order the admin's list gives them. */
async function listedNames(admin: { authorization: string }) {
  const response = await adminRequest(app, admin, 'get', '/governorates');
  return (response.body as { data: { nameAr: string }[] }).data.map(({ nameAr }) => nameAr);
}

describe('the governorates endpoints', () => {
  const endpoints = [
    {
      name: 'GET /governorates',
      method: 'get',
      path: () => '/governorates',
      body: undefined,
      status: 200,
    },
    {
      name: 'POST /governorates',
      method: 'post',
      path: () => '/governorates',
      body: { nameAr: 'رفح', nameEn: 'Rafah' },
      status: 201,
    },
    {
      name: 'PATCH /governorates/:id',
      method: 'patch',
      path: (id: number) => `/governorates/${String(id)}`,
      body: { nameEn: 'Gaza' },
      status: 200,
    },
    {
      name: 'PUT /governorates/order',
      method: 'put',
      path: () => '/governorates/order',
      body: 'the current list',
      status: 204,
    },
  ] as const;

  describe.each(endpoints)('$name', ({ method, path, body, status }) => {
    async function send(caller: Parameters<typeof adminRequest>[1]) {
      const gaza = await governorate('غزة', 'Gaza City', 0);
      const sent = body === 'the current list' ? { ids: [gaza.id] } : body;
      return adminRequest(app, caller, method, path(gaza.id), sent);
    }

    it.each(REFUSED_CALLERS)('refuses $caller with $status', async ({ caller, ...refusal }) => {
      const response = await send(caller);

      expect(response.status).toBe(refusal.status);
      const { type, code } = errorOf(response) as { type: string; code?: string };
      expect({ type, code }).toEqual({ type: refusal.type, code: refusal.code });
      expect(await prisma.governorate.findMany({ select: { nameAr: true, nameEn: true } })).toEqual(
        [{ nameAr: 'غزة', nameEn: 'Gaza City' }],
      );
    });

    it(`answers the admin with ${String(status)}`, async () => {
      expect((await send(await signIn('ADMIN'))).status).toBe(status);
    });
  });
});

describe('GET /admin/governorates', () => {
  it('lists every governorate with its areas, hidden ones included, each list in order', async () => {
    const admin = await signIn('ADMIN');
    const rafah = await governorate('رفح', 'Rafah', 2, false);
    const gaza = await governorate('غزة', 'Gaza City', 1);
    const shati = await prisma.area.create({
      data: { governorateId: gaza.id, nameAr: 'الشاطئ', nameEn: 'Ash-Shati', sortOrder: 1 },
    });
    const rimal = await prisma.area.create({
      data: {
        governorateId: gaza.id,
        nameAr: 'الرمال',
        nameEn: 'Al-Rimal',
        sortOrder: 0,
        isActive: false,
      },
    });

    const response = await adminRequest(app, admin, 'get', '/governorates');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [
        {
          id: gaza.id,
          nameAr: 'غزة',
          nameEn: 'Gaza City',
          isActive: true,
          areas: [
            {
              id: rimal.id,
              governorateId: gaza.id,
              nameAr: 'الرمال',
              nameEn: 'Al-Rimal',
              isActive: false,
            },
            {
              id: shati.id,
              governorateId: gaza.id,
              nameAr: 'الشاطئ',
              nameEn: 'Ash-Shati',
              isActive: true,
            },
          ],
        },
        { id: rafah.id, nameAr: 'رفح', nameEn: 'Rafah', isActive: false, areas: [] },
      ],
    });
  });

  it('orders governorates that share a place by id', async () => {
    const admin = await signIn('ADMIN');
    await governorate('غزة', 'Gaza City', 0);
    await governorate('رفح', 'Rafah', 0);

    expect(await listedNames(admin)).toEqual(['غزة', 'رفح']);
  });
});

describe('POST /admin/governorates', () => {
  it('adds an active governorate last, and audits it as added', async () => {
    const admin = await signIn('ADMIN');
    await governorate('غزة', 'Gaza City', 4);

    const response = await adminRequest(app, admin, 'post', '/governorates', {
      nameAr: ' رفح ',
      nameEn: 'Rafah',
    });

    expect(response.status).toBe(201);
    const { id } = (response.body as { data: { id: number } }).data;
    expect(response.body).toEqual({
      success: true,
      data: { id, nameAr: 'رفح', nameEn: 'Rafah', isActive: true },
    });
    expect(await prisma.governorate.findUnique({ where: { id } })).toMatchObject({ sortOrder: 5 });
    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'governorate.added',
        entityType: 'governorate',
        entityId: id,
        spaceId: null,
        before: null,
        after: { nameAr: 'رفح', nameEn: 'Rafah' },
      },
    ]);
  });

  it('places the first governorate at 0', async () => {
    const admin = await signIn('ADMIN');

    await adminRequest(app, admin, 'post', '/governorates', { nameAr: 'رفح', nameEn: 'Rafah' });

    expect(await prisma.governorate.findFirst()).toMatchObject({ sortOrder: 0 });
  });

  it('answers 422 for missing or invalid names', async () => {
    const admin = await signIn('ADMIN');

    const response = await adminRequest(app, admin, 'post', '/governorates', {
      nameEn: 'Ra\nfah',
    });

    expect(response.status).toBe(422);
    expect(errorOf(response)).toMatchObject({
      type: 'validation',
      errors: { nameAr: ['required'], nameEn: ['invalid_format'] },
    });
  });

  it('answers 409 not_unique for an Arabic name another governorate holds, a hidden one included', async () => {
    const admin = await signIn('ADMIN');
    await governorate('رفح', 'Rafah', 0, false);

    const response = await adminRequest(app, admin, 'post', '/governorates', {
      nameAr: 'رفح',
      nameEn: 'Rafah 2',
    });

    expect(response.status).toBe(409);
    expect(errorOf(response)).toMatchObject({
      type: 'conflict',
      errors: { nameAr: ['not_unique'] },
    });
    expect(errorOf(response).code).toBeUndefined();
    expect(await prisma.governorate.count()).toBe(1);
    expect(await auditEntries()).toEqual([]);
  });

  it('rolls the governorate back when its audit entry cannot be written', async () => {
    const admin = await signIn('ADMIN');
    // The token outlives its account, so the entry's actor no longer exists and its insert fails.
    await prisma.user.delete({ where: { id: admin.id } });

    const response = await adminRequest(app, admin, 'post', '/governorates', {
      nameAr: 'رفح',
      nameEn: 'Rafah',
    });

    expect(response.status).toBe(500);
    expect(await prisma.governorate.count()).toBe(0);
    expect(await auditEntries()).toEqual([]);
  });
});

describe('PATCH /admin/governorates/:id', () => {
  it('renames it, and audits only the changed name as edited', async () => {
    const admin = await signIn('ADMIN');
    const gaza = await governorate('غزة', 'Gaza', 0);

    const response = await adminRequest(app, admin, 'patch', `/governorates/${String(gaza.id)}`, {
      nameAr: 'غزة',
      nameEn: 'Gaza City',
    });

    expect(response.status).toBe(200);
    expect(dataOf(response)).toEqual({
      id: gaza.id,
      nameAr: 'غزة',
      nameEn: 'Gaza City',
      isActive: true,
    });
    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'governorate.edited',
        entityType: 'governorate',
        entityId: gaza.id,
        spaceId: null,
        before: { nameEn: 'Gaza' },
        after: { nameEn: 'Gaza City' },
      },
    ]);
  });

  it('hides and restores it, each audited, leaving its areas’ own flags alone', async () => {
    const admin = await signIn('ADMIN');
    const rafah = await governorate('رفح', 'Rafah', 0);
    await prisma.area.create({
      data: { governorateId: rafah.id, nameAr: 'تل السلطان', nameEn: 'Tel as-Sultan' },
    });
    const path = `/governorates/${String(rafah.id)}`;

    const hidden = await adminRequest(app, admin, 'patch', path, { isActive: false });
    expect(dataOf(hidden)).toMatchObject({ isActive: false });
    expect(await prisma.area.findFirst()).toMatchObject({ isActive: true });

    const restored = await adminRequest(app, admin, 'patch', path, { isActive: true });
    expect(dataOf(restored)).toMatchObject({ isActive: true });

    expect(await auditEntries()).toMatchObject([
      { action: 'governorate.hidden', before: { isActive: true }, after: { isActive: false } },
      { action: 'governorate.restored', before: { isActive: false }, after: { isActive: true } },
    ]);
  });

  it('audits a new name and a hide in one request as two entries', async () => {
    const admin = await signIn('ADMIN');
    const rafah = await governorate('رفح', 'Rafah', 0);

    await adminRequest(app, admin, 'patch', `/governorates/${String(rafah.id)}`, {
      nameAr: 'محافظة رفح',
      isActive: false,
    });

    expect(await auditEntries()).toMatchObject([
      { action: 'governorate.edited', before: { nameAr: 'رفح' }, after: { nameAr: 'محافظة رفح' } },
      { action: 'governorate.hidden' },
    ]);
  });

  it('writes and audits nothing for a patch that changes nothing', async () => {
    const admin = await signIn('ADMIN');
    const rafah = await governorate('رفح', 'Rafah', 0);

    const response = await adminRequest(app, admin, 'patch', `/governorates/${String(rafah.id)}`, {
      nameEn: 'Rafah',
      isActive: true,
    });

    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({ nameEn: 'Rafah', isActive: true });
    expect(await prisma.governorate.findUnique({ where: { id: rafah.id } })).toMatchObject({
      updatedAt: rafah.updatedAt,
    });
    expect(await auditEntries()).toEqual([]);
  });

  it('answers 409 not_unique for another governorate’s Arabic name, changing nothing', async () => {
    const admin = await signIn('ADMIN');
    await governorate('غزة', 'Gaza City', 0);
    const rafah = await governorate('رفح', 'Rafah', 1);

    const response = await adminRequest(app, admin, 'patch', `/governorates/${String(rafah.id)}`, {
      nameAr: 'غزة',
      isActive: false,
    });

    expect(response.status).toBe(409);
    expect(errorOf(response)).toMatchObject({
      type: 'conflict',
      errors: { nameAr: ['not_unique'] },
    });
    expect(await prisma.governorate.findUnique({ where: { id: rafah.id } })).toMatchObject({
      nameAr: 'رفح',
      isActive: true,
    });
    expect(await auditEntries()).toEqual([]);
  });

  it('answers 422 for an invalid field', async () => {
    const admin = await signIn('ADMIN');
    const rafah = await governorate('رفح', 'Rafah', 0);

    const response = await adminRequest(app, admin, 'patch', `/governorates/${String(rafah.id)}`, {
      nameAr: '',
      isActive: 'no',
    });

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({
      nameAr: ['too_short'],
      isActive: ['invalid_format'],
    });
  });

  it.each(['999', 'abc', '0'])('answers 404 for the id %s', async (id) => {
    const admin = await signIn('ADMIN');

    const response = await adminRequest(app, admin, 'patch', `/governorates/${id}`, {
      nameEn: 'Gaza',
    });

    expect(response.status).toBe(404);
    expect(errorOf(response).type).toBe('not_found');
  });

  it('rolls the change back when its audit entry cannot be written', async () => {
    const admin = await signIn('ADMIN');
    const rafah = await governorate('رفح', 'Rafah', 0);
    await prisma.user.delete({ where: { id: admin.id } });

    const response = await adminRequest(app, admin, 'patch', `/governorates/${String(rafah.id)}`, {
      isActive: false,
    });

    expect(response.status).toBe(500);
    expect(await prisma.governorate.findUnique({ where: { id: rafah.id } })).toMatchObject({
      isActive: true,
    });
  });
});

describe('PUT /admin/governorates/order', () => {
  async function threeGovernorates() {
    return {
      north: await governorate('شمال غزة', 'North Gaza', 0),
      gaza: await governorate('غزة', 'Gaza City', 1),
      rafah: await governorate('رفح', 'Rafah', 2),
    };
  }

  it('puts the governorates in the order given, and audits nothing', async () => {
    const admin = await signIn('ADMIN');
    const { north, gaza, rafah } = await threeGovernorates();
    const ids = [rafah.id, north.id, gaza.id];

    const response = await adminRequest(app, admin, 'put', '/governorates/order', { ids });

    expect(response.status).toBe(204);
    expect(await listedNames(admin)).toEqual(['رفح', 'شمال غزة', 'غزة']);
    expect(await auditEntries()).toEqual([]);

    const again = await adminRequest(app, admin, 'put', '/governorates/order', { ids });
    expect(again.status).toBe(204);
    expect(await listedNames(admin)).toEqual(['رفح', 'شمال غزة', 'غزة']);
  });

  it.each([
    ['a missing id', ([first, second]: number[]) => [first, second]],
    ['an extra id', (ids: number[]) => [...ids, 999]],
    ['a repeated id', ([first, , third]: number[]) => [first, first, third]],
  ])('answers 409 for a list with %s, changing nothing', async (_case, alter) => {
    const admin = await signIn('ADMIN');
    const { north, gaza, rafah } = await threeGovernorates();

    const response = await adminRequest(app, admin, 'put', '/governorates/order', {
      ids: alter([rafah.id, gaza.id, north.id]),
    });

    expect(response.status).toBe(409);
    expect(errorOf(response)).toMatchObject({ type: 'conflict' });
    expect(errorOf(response).code).toBeUndefined();
    expect(await listedNames(admin)).toEqual(['شمال غزة', 'غزة', 'رفح']);
  });

  it('answers 409 for a list that misses a governorate added since', async () => {
    const admin = await signIn('ADMIN');
    const { north, gaza, rafah } = await threeGovernorates();
    const seen = [rafah.id, gaza.id, north.id];
    await adminRequest(app, admin, 'post', '/governorates', {
      nameAr: 'الوسطى',
      nameEn: 'Middle Area',
    });

    const response = await adminRequest(app, admin, 'put', '/governorates/order', { ids: seen });

    expect(response.status).toBe(409);
  });

  it('answers 422 for a body without ids', async () => {
    const admin = await signIn('ADMIN');

    const response = await adminRequest(app, admin, 'put', '/governorates/order', {});

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ ids: ['required'] });
  });
});
