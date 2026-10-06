import { beforeEach, describe, expect, it } from 'vitest';

import { adminRequest, auditEntries, dataOf, errorOf, signIn } from '../../../../test/admin.ts';
import { createTestApp } from '../../../../test/app.ts';
import { createSpace } from '../../../../test/factories.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { createArea, seedSettings } from '../../../../test/spaces.ts';
import { prisma } from '../../../db/index.ts';

const NOW = new Date('2026-10-06T09:00:00.000Z');
const BEFORE = new Date('2026-09-01T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });

let admin: { id: number; authorization: string };
let spaceId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  admin = await signIn('ADMIN');
  const space = await createSpace();
  spaceId = space.id;
  await prisma.space.update({
    where: { id: spaceId },
    data: {
      profileUpdatedAt: BEFORE,
      hoursUpdatedAt: BEFORE,
      pricesUpdatedAt: BEFORE,
      amenitiesUpdatedAt: BEFORE,
      contactsUpdatedAt: BEFORE,
    },
  });
});

function edit(body: object, id = spaceId) {
  return adminRequest(app, admin, 'patch', `/spaces/${String(id)}`, body);
}

/** A link of a new user to the space. */
async function link(role: 'OWNER' | 'RECEPTION') {
  const user = await prisma.user.create({
    data: { email: `${role.toLowerCase()}@example.com`, name: 'Ahmad', passwordHash: 'x' },
  });
  await prisma.spaceManager.create({ data: { spaceId, userId: user.id, role } });
}

describe('PATCH /admin/spaces/:spaceId', () => {
  it('edits the profile of an unverified space, dates it now and keeps the slug', async () => {
    const response = await edit({
      nameEn: 'Branch Hub',
      nameAr: null,
      descriptionEn: 'Quiet desks.\nA corner for calls.',
      landmarkAr: 'قرب مفترق العيون',
      location: { lat: 31.5, lng: 34.46 },
    });

    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      slug: 'focus-hub',
      nameEn: 'Branch Hub',
      nameAr: null,
      descriptionEn: 'Quiet desks.\nA corner for calls.',
      landmarkAr: 'قرب مفترق العيون',
      location: { lat: 31.5, lng: 34.46 },
      isVerified: false,
      updatedAt: {
        profile: NOW.toISOString(),
        hours: BEFORE.toISOString(),
        prices: BEFORE.toISOString(),
        amenities: BEFORE.toISOString(),
        contacts: BEFORE.toISOString(),
      },
    });
  });

  it('audits only what changed, before and after', async () => {
    await edit({ nameEn: 'Focus Hub', nameAr: null, location: { lat: 31.5, lng: 34.46 } });

    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'space.profileEdited',
        entityType: 'space',
        entityId: spaceId,
        spaceId,
        before: { nameAr: 'فوكس هاب', lat: 31.53 },
        after: { nameAr: null, lat: 31.5 },
      },
    ]);
  });

  it('writes nothing, the date included, for an edit that changes nothing', async () => {
    const response = await edit({ nameEn: 'Focus Hub', addressAr: 'غرب المزنر' });

    expect(response.status).toBe(200);
    expect(await auditEntries()).toEqual([]);
    expect(
      (await prisma.space.findUniqueOrThrow({ where: { id: spaceId } })).profileUpdatedAt,
    ).toEqual(BEFORE);
  });

  it('refuses the admin once an owner has joined: the owner edits it then', async () => {
    await link('OWNER');

    const response = await edit({ nameEn: 'Branch Hub' });

    expect(response.status).toBe(403);
    expect(errorOf(response).type).toBe('forbidden');
    expect((await prisma.space.findUniqueOrThrow({ where: { id: spaceId } })).nameEn).toBe(
      'Focus Hub',
    );
    expect(await auditEntries()).toEqual([]);
  });

  it('still lets the admin edit a space with only a reception account', async () => {
    await link('RECEPTION');

    expect((await edit({ nameEn: 'Branch Hub' })).status).toBe(200);
  });

  it('moves the space to an active area, and refuses a hidden one', async () => {
    const active = await createArea();
    const hidden = await createArea({ areaActive: false });

    const refused = await edit({ areaId: hidden.id });
    const moved = await edit({ areaId: active.id });

    expect(refused.status).toBe(422);
    expect(errorOf(refused).errors).toEqual({ areaId: ['invalid_choice'] });
    expect((dataOf(moved) as { areaId: number }).areaId).toBe(active.id);
  });

  it('refuses a pin outside the Gaza Strip, and clearing a required field', async () => {
    const outside = await edit({ location: { lat: 0, lng: 0 } });
    const cleared = await edit({ nameEn: null, addressAr: null });

    expect(errorOf(outside).errors).toEqual({ location: ['out_of_range'] });
    expect(errorOf(cleared).errors).toEqual({
      nameEn: ['invalid_format'],
      addressAr: ['invalid_format'],
    });
  });

  it('answers not_found for a soft-deleted space and an unknown one', async () => {
    await prisma.space.update({ where: { id: spaceId }, data: { deletedAt: NOW } });

    expect((await edit({ nameEn: 'Branch Hub' })).status).toBe(404);
    expect((await edit({ nameEn: 'Branch Hub' }, 999)).status).toBe(404);
  });
});
