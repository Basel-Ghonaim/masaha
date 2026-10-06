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

function governorate(nameAr = 'غزة', nameEn = 'Gaza City') {
  return prisma.governorate.create({ data: { nameAr, nameEn } });
}

function area(governorateId: number, nameAr: string, nameEn: string, sortOrder = 0) {
  return prisma.area.create({ data: { governorateId, nameAr, nameEn, sortOrder } });
}

/** The governorate's areas' Arabic names, in order. */
async function areaNames(governorateId: number) {
  const areas = await prisma.area.findMany({
    where: { governorateId },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return areas.map(({ nameAr }) => nameAr);
}

describe('the areas endpoints', () => {
  const endpoints = [
    {
      name: 'POST /areas',
      method: 'post',
      path: () => '/areas',
      body: (governorateId: number) => ({ governorateId, nameAr: 'الرمال', nameEn: 'Al-Rimal' }),
      status: 201,
    },
    {
      name: 'PATCH /areas/:id',
      method: 'patch',
      path: ({ areaId }: { areaId: number }) => `/areas/${String(areaId)}`,
      body: () => ({ nameEn: 'Nasr' }),
      status: 200,
    },
    {
      name: 'PUT /governorates/:id/areas/order',
      method: 'put',
      path: ({ governorateId }: { governorateId: number }) =>
        `/governorates/${String(governorateId)}/areas/order`,
      body: (_governorateId: number, areaId: number) => ({ ids: [areaId] }),
      status: 204,
    },
  ] as const;

  describe.each(endpoints)('$name', ({ method, path, body, status }) => {
    async function send(caller: Parameters<typeof adminRequest>[1]) {
      const gaza = await governorate();
      const nasr = await area(gaza.id, 'النصر', 'An-Nasr');
      const ids = { governorateId: gaza.id, areaId: nasr.id };
      return adminRequest(app, caller, method, path(ids), body(gaza.id, nasr.id));
    }

    it.each(REFUSED_CALLERS)('refuses $caller with $status', async ({ caller, ...refusal }) => {
      const response = await send(caller);

      expect(response.status).toBe(refusal.status);
      const { type, code } = errorOf(response);
      expect({ type, code }).toEqual({ type: refusal.type, code: refusal.code });
      expect(await prisma.area.findMany({ select: { nameAr: true, nameEn: true } })).toEqual([
        { nameAr: 'النصر', nameEn: 'An-Nasr' },
      ]);
    });

    it(`answers the admin with ${String(status)}`, async () => {
      expect((await send(await signIn('ADMIN'))).status).toBe(status);
    });
  });
});

describe('POST /admin/areas', () => {
  it('adds an active area last in its governorate, and audits it as added', async () => {
    const admin = await signIn('ADMIN');
    const gaza = await governorate();
    const rafah = await governorate('رفح', 'Rafah');
    await area(gaza.id, 'النصر', 'An-Nasr', 3);
    await area(rafah.id, 'تل السلطان', 'Tel as-Sultan', 9);

    const response = await adminRequest(app, admin, 'post', '/areas', {
      governorateId: gaza.id,
      nameAr: 'الرمال',
      nameEn: 'Al-Rimal',
    });

    expect(response.status).toBe(201);
    const { id } = dataOf(response) as { id: number };
    expect(dataOf(response)).toEqual({
      id,
      governorateId: gaza.id,
      nameAr: 'الرمال',
      nameEn: 'Al-Rimal',
      isActive: true,
    });
    expect(await prisma.area.findUnique({ where: { id } })).toMatchObject({ sortOrder: 4 });
    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'area.added',
        entityType: 'area',
        entityId: id,
        spaceId: null,
        before: null,
        after: { governorateId: gaza.id, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
      },
    ]);
  });

  it('adds an area to a hidden governorate', async () => {
    const admin = await signIn('ADMIN');
    const rafah = await prisma.governorate.create({
      data: { nameAr: 'رفح', nameEn: 'Rafah', isActive: false },
    });

    const response = await adminRequest(app, admin, 'post', '/areas', {
      governorateId: rafah.id,
      nameAr: 'تل السلطان',
      nameEn: 'Tel as-Sultan',
    });

    expect(response.status).toBe(201);
    expect(await prisma.area.findFirst()).toMatchObject({ sortOrder: 0 });
  });

  it('answers 409 not_unique for an Arabic name taken in the same governorate only', async () => {
    const admin = await signIn('ADMIN');
    const gaza = await governorate();
    const rafah = await governorate('رفح', 'Rafah');
    await area(gaza.id, 'النصر', 'An-Nasr');

    const taken = await adminRequest(app, admin, 'post', '/areas', {
      governorateId: gaza.id,
      nameAr: 'النصر',
      nameEn: 'Nasr',
    });
    const elsewhere = await adminRequest(app, admin, 'post', '/areas', {
      governorateId: rafah.id,
      nameAr: 'النصر',
      nameEn: 'An-Nasr',
    });

    expect(taken.status).toBe(409);
    expect(errorOf(taken)).toMatchObject({ type: 'conflict', errors: { nameAr: ['not_unique'] } });
    expect(elsewhere.status).toBe(201);
    expect(await auditEntries()).toMatchObject([{ action: 'area.added' }]);
  });

  it('answers 404 for an unknown governorate', async () => {
    const admin = await signIn('ADMIN');

    const response = await adminRequest(app, admin, 'post', '/areas', {
      governorateId: 999,
      nameAr: 'النصر',
      nameEn: 'An-Nasr',
    });

    expect(response.status).toBe(404);
    expect(await prisma.area.count()).toBe(0);
  });

  it('answers 422 for a missing governorate or invalid names', async () => {
    const admin = await signIn('ADMIN');

    const response = await adminRequest(app, admin, 'post', '/areas', {
      nameAr: 'النصر‏',
      nameEn: '',
    });

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({
      governorateId: ['required'],
      nameAr: ['invalid_format'],
      nameEn: ['too_short'],
    });
  });
});

describe('PATCH /admin/areas/:id', () => {
  it('renames, hides and restores it, each audited, and never moves it', async () => {
    const admin = await signIn('ADMIN');
    const gaza = await governorate();
    const rafah = await governorate('رفح', 'Rafah');
    const nasr = await area(gaza.id, 'النصر', 'Nasr');
    const path = `/areas/${String(nasr.id)}`;

    const renamed = await adminRequest(app, admin, 'patch', path, {
      nameEn: 'An-Nasr',
      governorateId: rafah.id,
    });
    expect(renamed.status).toBe(200);
    expect(dataOf(renamed)).toEqual({
      id: nasr.id,
      governorateId: gaza.id,
      nameAr: 'النصر',
      nameEn: 'An-Nasr',
      isActive: true,
    });

    await adminRequest(app, admin, 'patch', path, { isActive: false });
    await adminRequest(app, admin, 'patch', path, { nameAr: 'حي النصر', isActive: true });

    expect(await auditEntries()).toEqual([
      expect.objectContaining({
        actorId: admin.id,
        action: 'area.edited',
        entityType: 'area',
        entityId: nasr.id,
        before: { nameEn: 'Nasr' },
        after: { nameEn: 'An-Nasr' },
      }),
      expect.objectContaining({ action: 'area.hidden', after: { isActive: false } }),
      expect.objectContaining({ action: 'area.edited', after: { nameAr: 'حي النصر' } }),
      expect.objectContaining({ action: 'area.restored', after: { isActive: true } }),
    ]);
  });

  it('answers 409 not_unique for another area’s Arabic name in its governorate', async () => {
    const admin = await signIn('ADMIN');
    const gaza = await governorate();
    await area(gaza.id, 'الرمال', 'Al-Rimal');
    const nasr = await area(gaza.id, 'النصر', 'An-Nasr', 1);

    const response = await adminRequest(app, admin, 'patch', `/areas/${String(nasr.id)}`, {
      nameAr: 'الرمال',
    });

    expect(response.status).toBe(409);
    expect(errorOf(response)).toMatchObject({ errors: { nameAr: ['not_unique'] } });
    expect(await prisma.area.findUnique({ where: { id: nasr.id } })).toMatchObject({
      nameAr: 'النصر',
    });
    expect(await auditEntries()).toEqual([]);
  });

  it('answers 404 for an unknown area', async () => {
    const admin = await signIn('ADMIN');

    const response = await adminRequest(app, admin, 'patch', '/areas/999', { nameEn: 'Nasr' });

    expect(response.status).toBe(404);
  });
});

describe('PUT /admin/governorates/:id/areas/order', () => {
  async function gazaWithAreas() {
    const gaza = await governorate();
    return {
      gaza,
      nasr: await area(gaza.id, 'النصر', 'An-Nasr', 0),
      rimal: await area(gaza.id, 'الرمال', 'Al-Rimal', 1),
      shati: await area(gaza.id, 'الشاطئ', 'Ash-Shati', 2),
    };
  }

  it('puts the governorate’s areas in the order given, and audits nothing', async () => {
    const admin = await signIn('ADMIN');
    const { gaza, nasr, rimal, shati } = await gazaWithAreas();
    const path = `/governorates/${String(gaza.id)}/areas/order`;

    const response = await adminRequest(app, admin, 'put', path, {
      ids: [shati.id, nasr.id, rimal.id],
    });

    expect(response.status).toBe(204);
    expect(await areaNames(gaza.id)).toEqual(['الشاطئ', 'النصر', 'الرمال']);
    expect(await auditEntries()).toEqual([]);
  });

  it('answers 409 for a list that names another governorate’s area, changing nothing', async () => {
    const admin = await signIn('ADMIN');
    const { gaza, nasr, rimal } = await gazaWithAreas();
    const rafah = await governorate('رفح', 'Rafah');
    const sultan = await area(rafah.id, 'تل السلطان', 'Tel as-Sultan');

    const response = await adminRequest(
      app,
      admin,
      'put',
      `/governorates/${String(gaza.id)}/areas/order`,
      { ids: [rimal.id, nasr.id, sultan.id] },
    );

    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBeUndefined();
    expect(await areaNames(gaza.id)).toEqual(['النصر', 'الرمال', 'الشاطئ']);
  });

  it('answers 409 for a list that misses an area added since', async () => {
    const admin = await signIn('ADMIN');
    const { gaza, nasr, rimal, shati } = await gazaWithAreas();
    await adminRequest(app, admin, 'post', '/areas', {
      governorateId: gaza.id,
      nameAr: 'الدرج',
      nameEn: 'Ad-Daraj',
    });

    const response = await adminRequest(
      app,
      admin,
      'put',
      `/governorates/${String(gaza.id)}/areas/order`,
      { ids: [shati.id, rimal.id, nasr.id] },
    );

    expect(response.status).toBe(409);
  });

  it('answers 404 for an unknown governorate', async () => {
    const admin = await signIn('ADMIN');

    const response = await adminRequest(app, admin, 'put', '/governorates/999/areas/order', {
      ids: [],
    });

    expect(response.status).toBe(404);
  });
});
