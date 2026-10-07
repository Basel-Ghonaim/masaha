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

const DATED = {
  profileUpdatedAt: BEFORE,
  hoursUpdatedAt: BEFORE,
  pricesUpdatedAt: BEFORE,
  amenitiesUpdatedAt: BEFORE,
  contactsUpdatedAt: BEFORE,
};

const MONTH = {
  period: 'MONTH',
  audience: 'GENERAL',
  shiftId: null,
  labelAr: null,
  labelEn: null,
  amountAgorot: 30_000,
} as const;

let admin: { id: number; authorization: string };
let spaceId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  admin = await signIn('ADMIN');
  ({ id: spaceId } = await createSpace());
  await prisma.space.update({ where: { id: spaceId }, data: DATED });
});

function save(prices: object[], id = spaceId) {
  return adminRequest(app, admin, 'put', `/spaces/${String(id)}/prices`, { prices });
}

function shiftOf(id: number, nameAr = 'صباحية') {
  return prisma.spaceShift.create({
    data: { spaceId: id, nameAr, startsMinute: 480, endsMinute: 780 },
  });
}

/** The prices the database holds, in their order, and the prices' date. */
async function stored() {
  return {
    prices: await prisma.spacePrice.findMany({
      where: { spaceId },
      orderBy: { sortOrder: 'asc' },
      select: {
        period: true,
        audience: true,
        shiftId: true,
        labelAr: true,
        labelEn: true,
        amountAgorot: true,
        sortOrder: true,
      },
    }),
    pricesUpdatedAt: (await prisma.space.findUniqueOrThrow({ where: { id: spaceId } }))
      .pricesUpdatedAt,
  };
}

describe('PUT /admin/spaces/:spaceId/prices', () => {
  it('replaces the prices in their order, dates them now and leaves the other groups’ dates', async () => {
    const morning = await shiftOf(spaceId);
    await prisma.spacePrice.create({ data: { spaceId, period: 'HOUR', amountAgorot: 500 } });
    const prices = [
      { ...MONTH, audience: 'STUDENT', amountAgorot: 25_000 },
      { ...MONTH, shiftId: morning.id, labelAr: 'مكتب ثابت', labelEn: 'Fixed desk' },
      MONTH,
    ];

    const response = await save(prices);

    expect(response.status).toBe(200);
    const data = dataOf(response) as { prices: unknown; updatedAt: unknown };
    expect(data.prices).toEqual(prices);
    expect(data.updatedAt).toEqual({
      profile: BEFORE.toISOString(),
      hours: BEFORE.toISOString(),
      prices: NOW.toISOString(),
      amenities: BEFORE.toISOString(),
      contacts: BEFORE.toISOString(),
    });
    expect(await stored()).toEqual({
      prices: prices.map((price, sortOrder) => ({ ...price, sortOrder })),
      pricesUpdatedAt: NOW,
    });
  });

  it('answers the prices in the space’s read', async () => {
    await save([MONTH]);

    const response = await adminRequest(app, admin, 'get', `/spaces/${String(spaceId)}`);

    expect((dataOf(response) as { prices: unknown }).prices).toEqual([MONTH]);
  });

  it('audits the prices before and after, whole, in one entry', async () => {
    await prisma.spacePrice.create({ data: { spaceId, period: 'DAY', amountAgorot: 2_500 } });

    await save([MONTH]);

    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'space.pricesEdited',
        entityType: 'space',
        entityId: spaceId,
        spaceId,
        before: { prices: [{ ...MONTH, period: 'DAY', amountAgorot: 2_500 }] },
        after: { prices: [MONTH] },
      },
    ]);
  });

  it('refuses a shift of another space, writing nothing', async () => {
    const theirs = await shiftOf((await createSpace('other-hub')).id);

    const response = await save([MONTH, { ...MONTH, shiftId: theirs.id }]);

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ 'prices.1.shiftId': ['invalid_choice'] });
    expect(await stored()).toEqual({ prices: [], pricesUpdatedAt: BEFORE });
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses a repeated price with the shared rules, on its own field', async () => {
    const response = await save([MONTH, { ...MONTH, amountAgorot: 1 }]);

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ 'prices.1.period': ['not_unique'] });
  });

  it('dates the prices at their first save, even with none, and a repeat writes nothing', async () => {
    await prisma.space.update({ where: { id: spaceId }, data: { pricesUpdatedAt: null } });

    const first = await save([]);
    await prisma.space.update({ where: { id: spaceId }, data: { pricesUpdatedAt: BEFORE } });
    const repeat = await save([]);

    expect((dataOf(first) as { missingGroups: string[] }).missingGroups).toEqual([]);
    expect(repeat.status).toBe(200);
    expect((await stored()).pricesUpdatedAt).toEqual(BEFORE);
    expect((await auditEntries()).map(({ action }) => action)).toEqual(['space.pricesEdited']);
  });

  it('waits for the space’s lock, then checks the shifts as they are: a shift removed meanwhile is refused', async () => {
    const morning = await shiftOf(spaceId);
    let pending: Promise<{ status: number; body: unknown }> | undefined;

    // An hours save in progress: it holds the space and removes the shift, and commits only after
    // the prices' save has started.
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;
      await tx.spaceShift.delete({ where: { id: morning.id } });
      pending = save([{ ...MONTH, shiftId: morning.id }]);
      await new Promise((resolve) => setTimeout(resolve, 500));
    });
    const response = await pending;

    expect(response?.status).toBe(422);
    expect(await stored()).toEqual({ prices: [], pricesUpdatedAt: BEFORE });
  });

  it('refuses the admin once an owner has joined, writing nothing', async () => {
    await signInOwnerOf(spaceId);

    const response = await save([MONTH]);

    expect(response.status).toBe(403);
    expect(errorOf(response).type).toBe('forbidden');
    expect(await stored()).toEqual({ prices: [], pricesUpdatedAt: BEFORE });
    expect(await auditEntries()).toEqual([]);
  });

  it('answers not_found for a soft-deleted space and an unknown one', async () => {
    await prisma.space.update({ where: { id: spaceId }, data: { deletedAt: NOW } });

    expect((await save([MONTH])).status).toBe(404);
    expect((await save([MONTH], 999)).status).toBe(404);
    expect(await prisma.spacePrice.count()).toBe(0);
  });
});
