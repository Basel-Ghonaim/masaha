import { beforeEach, describe, expect, it } from 'vitest';

import { adminRequest, auditEntries, dataOf, errorOf, signIn } from '../../../../test/admin.ts';
import { createTestApp } from '../../../../test/app.ts';
import { createSpace } from '../../../../test/factories.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { seedSettings, signInOwnerOf } from '../../../../test/spaces.ts';
import { prisma } from '../../../db/index.ts';

const NOW = new Date('2026-10-06T09:00:00.000Z');
const BEFORE = new Date('2026-09-01T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });

// Two of a space's own amenities, the first after the second in the alphabet: their order is the
// list's, never the names'.
const PRINTER = { nameAr: 'طابعة', nameEn: 'Printer' };
const LOCKERS = { nameAr: 'خزائن', nameEn: null };

let admin: { id: number; authorization: string };
let spaceId: number;
let internet: number;
let power: number;
let retired: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  admin = await signIn('ADMIN');
  ({ id: spaceId } = await createSpace());
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
  const amenity = async (key: string, isActive = true) =>
    (
      await prisma.amenity.create({
        data: { key, nameAr: key, nameEn: key, icon: 'internet', isActive },
      })
    ).id;
  internet = await amenity('internet');
  power = await amenity('stable_power');
  retired = await amenity('fax', false);
});

function save(amenityIds: number[], ownAmenities: object[] = [], id = spaceId) {
  return adminRequest(app, admin, 'put', `/spaces/${String(id)}/amenities`, {
    amenityIds,
    ownAmenities,
  });
}

/** The space's amenity ids, by id, its own amenities, in order, and the amenities' date. */
async function stored() {
  return {
    amenityIds: (
      await prisma.spaceAmenity.findMany({
        where: { spaceId },
        orderBy: { amenityId: 'asc' },
        select: { amenityId: true },
      })
    ).map(({ amenityId }) => amenityId),
    ownAmenities: await prisma.spaceOwnAmenity.findMany({
      where: { spaceId },
      orderBy: { sortOrder: 'asc' },
      select: { nameAr: true, nameEn: true },
    }),
    amenitiesUpdatedAt: (await prisma.space.findUniqueOrThrow({ where: { id: spaceId } }))
      .amenitiesUpdatedAt,
  };
}

describe('PUT /admin/spaces/:spaceId/amenities', () => {
  it('makes the space’s amenities exactly the set, dates them now and leaves the other groups’ dates', async () => {
    await prisma.spaceAmenity.create({ data: { spaceId, amenityId: internet } });

    const response = await save([power]);

    expect(response.status).toBe(200);
    const data = dataOf(response) as { amenityIds: unknown; updatedAt: unknown };
    expect(data.amenityIds).toEqual([power]);
    expect(data.updatedAt).toEqual({
      profile: BEFORE.toISOString(),
      hours: BEFORE.toISOString(),
      prices: BEFORE.toISOString(),
      amenities: NOW.toISOString(),
      contacts: BEFORE.toISOString(),
    });
    expect(await stored()).toEqual({
      amenityIds: [power],
      ownAmenities: [],
      amenitiesUpdatedAt: NOW,
    });
  });

  it('saves the space’s own amenities beside the platform’s, in their order', async () => {
    const response = await save([internet], [PRINTER, { nameAr: 'خزائن' }]);

    expect(response.status).toBe(200);
    expect((dataOf(response) as { ownAmenities: unknown }).ownAmenities).toEqual([
      PRINTER,
      LOCKERS,
    ]);
    expect(await stored()).toEqual({
      amenityIds: [internet],
      ownAmenities: [PRINTER, LOCKERS],
      amenitiesUpdatedAt: NOW,
    });
  });

  it('answers the amenities in the space’s read, the platform’s by id and its own in order', async () => {
    await save([power, internet], [PRINTER, LOCKERS]);

    const response = await adminRequest(app, admin, 'get', `/spaces/${String(spaceId)}`);

    expect(dataOf(response)).toMatchObject({
      amenityIds: [internet, power],
      ownAmenities: [PRINTER, LOCKERS],
    });
  });

  it('audits the whole group before and after: the set by id, and its own amenities', async () => {
    await prisma.spaceAmenity.create({ data: { spaceId, amenityId: internet } });
    await prisma.spaceOwnAmenity.create({ data: { spaceId, nameAr: 'خزائن' } });

    await save([power, internet], [PRINTER, LOCKERS]);

    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'space.amenitiesEdited',
        entityType: 'space',
        entityId: spaceId,
        spaceId,
        before: { amenityIds: [internet], ownAmenities: [LOCKERS] },
        after: { amenityIds: [internet, power], ownAmenities: [PRINTER, LOCKERS] },
      },
    ]);
  });

  it('writes nothing when saved again unchanged, but a new order of its own amenities is a change', async () => {
    await save([internet], [PRINTER, LOCKERS]);
    await prisma.space.update({ where: { id: spaceId }, data: { amenitiesUpdatedAt: BEFORE } });

    // The same group, an English name absent where it was saved as none.
    const unchanged = await save([internet], [PRINTER, { nameAr: 'خزائن' }]);
    const afterUnchanged = await stored();
    const reordered = await save([internet], [LOCKERS, PRINTER]);

    expect(unchanged.status).toBe(200);
    expect(afterUnchanged.amenitiesUpdatedAt).toEqual(BEFORE);
    expect(reordered.status).toBe(200);
    expect(await stored()).toEqual({
      amenityIds: [internet],
      ownAmenities: [LOCKERS, PRINTER],
      amenitiesUpdatedAt: NOW,
    });
    expect((await auditEntries()).map(({ after }) => after)).toEqual([
      { amenityIds: [internet], ownAmenities: [PRINTER, LOCKERS] },
      { amenityIds: [internet], ownAmenities: [LOCKERS, PRINTER] },
    ]);
  });

  it('refuses an own amenity’s Arabic name repeated with the shared rules, writing nothing', async () => {
    const response = await save([internet], [PRINTER, { nameAr: 'طابعة', nameEn: 'Printers' }]);

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ 'ownAmenities.1.nameAr': ['not_unique'] });
    expect(await stored()).toEqual({
      amenityIds: [],
      ownAmenities: [],
      amenitiesUpdatedAt: BEFORE,
    });
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses to add a retired amenity, or one that does not exist, writing nothing', async () => {
    const response = await save([internet, retired, 999], [PRINTER]);

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({
      'amenityIds.1': ['invalid_choice'],
      'amenityIds.2': ['invalid_choice'],
    });
    expect(await stored()).toEqual({
      amenityIds: [],
      ownAmenities: [],
      amenitiesUpdatedAt: BEFORE,
    });
    expect(await auditEntries()).toEqual([]);
  });

  it('keeps a retired amenity the space already has, until it is removed', async () => {
    await prisma.spaceAmenity.create({ data: { spaceId, amenityId: retired } });

    const kept = await save([retired, internet]);
    const afterKept = (await stored()).amenityIds;
    const removed = await save([internet]);

    expect(kept.status).toBe(200);
    expect(afterKept).toEqual([internet, retired]);
    expect(removed.status).toBe(200);
    expect((await stored()).amenityIds).toEqual([internet]);
  });

  it('refuses an id repeated with the shared rules', async () => {
    const response = await save([internet, internet]);

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ 'amenityIds.1': ['not_unique'] });
  });

  it('dates the amenities at their first save, even with none, and a repeat writes nothing', async () => {
    await prisma.space.update({ where: { id: spaceId }, data: { amenitiesUpdatedAt: null } });

    await save([]);
    const first = await stored();
    await prisma.space.update({ where: { id: spaceId }, data: { amenitiesUpdatedAt: BEFORE } });
    await save([]);

    expect(first.amenitiesUpdatedAt).toEqual(NOW);
    expect((await stored()).amenitiesUpdatedAt).toEqual(BEFORE);
    expect(await auditEntries()).toEqual([
      expect.objectContaining({
        action: 'space.amenitiesEdited',
        before: { amenityIds: [], ownAmenities: [] },
        after: { amenityIds: [], ownAmenities: [] },
      }),
    ]);
  });

  it('refuses the admin once an owner has joined, writing nothing', async () => {
    await signInOwnerOf(spaceId);

    const response = await save([internet], [PRINTER]);

    expect(response.status).toBe(403);
    expect(await stored()).toEqual({
      amenityIds: [],
      ownAmenities: [],
      amenitiesUpdatedAt: BEFORE,
    });
    expect(await auditEntries()).toEqual([]);
  });

  it('answers not_found for a soft-deleted space and an unknown one', async () => {
    await prisma.space.update({ where: { id: spaceId }, data: { deletedAt: NOW } });

    expect((await save([internet], [PRINTER])).status).toBe(404);
    expect((await save([internet], [PRINTER], 999)).status).toBe(404);
    expect(await prisma.spaceAmenity.count()).toBe(0);
    expect(await prisma.spaceOwnAmenity.count()).toBe(0);
  });
});
