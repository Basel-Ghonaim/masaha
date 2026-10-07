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

const OPEN = { opensMinute: 480, closesMinute: 1080 };
// Sunday to Thursday 08:00–18:00, Friday closed, Saturday around the clock.
const WEEK = [OPEN, OPEN, OPEN, OPEN, OPEN, null, { opensMinute: 0, closesMinute: 1440 }];

let admin: { id: number; authorization: string };
let spaceId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  admin = await signIn('ADMIN');
  ({ id: spaceId } = await createSpace());
  await prisma.space.update({ where: { id: spaceId }, data: DATED });
});

function save(body: object, id = spaceId) {
  return adminRequest(app, admin, 'put', `/spaces/${String(id)}/hours`, body);
}

function shift(nameAr: string, startsMinute: number, endsMinute: number, sortOrder = 0) {
  return prisma.spaceShift.create({
    data: { spaceId, nameAr, nameEn: null, startsMinute, endsMinute, sortOrder },
  });
}

/** What the database holds of the hours: the week, the shifts and the hours' date. */
async function stored() {
  return {
    days: await prisma.spaceHours.findMany({
      where: { spaceId },
      orderBy: { dayOfWeek: 'asc' },
      select: { dayOfWeek: true, isClosed: true, opensMinute: true, closesMinute: true },
    }),
    shifts: await prisma.spaceShift.findMany({
      where: { spaceId },
      orderBy: { id: 'asc' },
      select: { id: true, nameAr: true, startsMinute: true, endsMinute: true },
    }),
    hoursUpdatedAt: (await prisma.space.findUniqueOrThrow({ where: { id: spaceId } }))
      .hoursUpdatedAt,
  };
}

describe('PUT /admin/spaces/:spaceId/hours', () => {
  it('replaces the week and the shifts, dates the hours now and leaves the other groups’ dates', async () => {
    const response = await save({
      days: WEEK,
      shifts: [
        { nameAr: 'صباحية', nameEn: 'Morning', startsMinute: 480, endsMinute: 780 },
        { nameAr: 'مسائية', startsMinute: 780, endsMinute: 1080 },
      ],
    });

    expect(response.status).toBe(200);
    const data = dataOf(response) as { hours: unknown; updatedAt: unknown };
    expect(data.hours).toEqual({
      days: WEEK,
      shifts: [
        {
          id: expect.any(Number) as number,
          nameAr: 'صباحية',
          nameEn: 'Morning',
          startsMinute: 480,
          endsMinute: 780,
        },
        {
          id: expect.any(Number) as number,
          nameAr: 'مسائية',
          nameEn: null,
          startsMinute: 780,
          endsMinute: 1080,
        },
      ],
    });
    expect(data.updatedAt).toEqual({
      profile: BEFORE.toISOString(),
      hours: NOW.toISOString(),
      prices: BEFORE.toISOString(),
      amenities: BEFORE.toISOString(),
      contacts: BEFORE.toISOString(),
    });
    expect((await stored()).days).toEqual([
      ...[0, 1, 2, 3, 4].map((dayOfWeek) => ({
        dayOfWeek,
        isClosed: false,
        opensMinute: 480,
        closesMinute: 1080,
      })),
      { dayOfWeek: 5, isClosed: true, opensMinute: null, closesMinute: null },
      { dayOfWeek: 6, isClosed: false, opensMinute: 0, closesMinute: 1440 },
    ]);
  });

  it('answers the hours in the space’s read', async () => {
    await save({ days: WEEK, shifts: [] });

    const response = await adminRequest(app, admin, 'get', `/spaces/${String(spaceId)}`);

    expect((dataOf(response) as { hours: unknown }).hours).toEqual({ days: WEEK, shifts: [] });
  });

  it('audits the hours before and after, whole, in one entry', async () => {
    const morning = await shift('صباحية', 480, 780);

    await save({
      days: WEEK,
      shifts: [
        { id: morning.id, nameAr: 'صباحية', nameEn: 'Morning', startsMinute: 480, endsMinute: 720 },
      ],
    });

    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'space.hoursEdited',
        entityType: 'space',
        entityId: spaceId,
        spaceId,
        before: {
          days: [],
          shifts: [
            { id: morning.id, nameAr: 'صباحية', nameEn: null, startsMinute: 480, endsMinute: 780 },
          ],
        },
        after: {
          days: WEEK,
          shifts: [
            {
              id: morning.id,
              nameAr: 'صباحية',
              nameEn: 'Morning',
              startsMinute: 480,
              endsMinute: 720,
            },
          ],
        },
      },
    ]);
  });

  it('keeps each named shift’s id, gives a new one its own, and removes one left out', async () => {
    const morning = await shift('صباحية', 480, 780, 0);
    const evening = await shift('مسائية', 780, 1080, 1);
    const gone = await shift('ليلية', 900, 1080, 2);

    const response = await save({
      days: WEEK,
      shifts: [
        { id: evening.id, nameAr: 'مسائية', startsMinute: 780, endsMinute: 1080 },
        { nameAr: 'كاملة', startsMinute: 480, endsMinute: 1080 },
        { id: morning.id, nameAr: 'صباحية', startsMinute: 480, endsMinute: 720 },
      ],
    });

    const shifts = (dataOf(response) as { hours: { shifts: { id: number; nameAr: string }[] } })
      .hours.shifts;
    expect(shifts.map(({ nameAr }) => nameAr)).toEqual(['مسائية', 'كاملة', 'صباحية']);
    expect(shifts[0]?.id).toBe(evening.id);
    expect(shifts[2]?.id).toBe(morning.id);
    expect([morning.id, evening.id, gone.id]).not.toContain(shifts[1]?.id);
    expect((await stored()).shifts.map(({ id }) => id)).not.toContain(gone.id);
  });

  it('lets two shifts swap their Arabic names', async () => {
    const morning = await shift('صباحية', 480, 780);
    const evening = await shift('مسائية', 780, 1080);

    const response = await save({
      days: WEEK,
      shifts: [
        { id: morning.id, nameAr: 'مسائية', startsMinute: 480, endsMinute: 780 },
        { id: evening.id, nameAr: 'صباحية', startsMinute: 780, endsMinute: 1080 },
      ],
    });

    expect(response.status).toBe(200);
    expect((await stored()).shifts).toEqual([
      { id: morning.id, nameAr: 'مسائية', startsMinute: 480, endsMinute: 780 },
      { id: evening.id, nameAr: 'صباحية', startsMinute: 780, endsMinute: 1080 },
    ]);
  });

  it('refuses to remove a shift a price uses, writing nothing: the price changes first', async () => {
    await prisma.spaceHours.create({
      data: { spaceId, dayOfWeek: 0, opensMinute: 600, closesMinute: 900 },
    });
    const morning = await shift('صباحية', 480, 780);
    await prisma.spacePrice.create({
      data: { spaceId, period: 'MONTH', shiftId: morning.id, amountAgorot: 25_000 },
    });
    const before = await stored();

    const response = await save({ days: WEEK, shifts: [] });

    expect(response.status).toBe(409);
    expect(errorOf(response).type).toBe('conflict');
    expect(errorOf(response).code).toBeUndefined();
    expect(await stored()).toEqual(before);
    expect(await prisma.spacePrice.findFirstOrThrow({ where: { spaceId } })).toMatchObject({
      shiftId: morning.id,
    });
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses an id that is not one of the space’s shifts', async () => {
    const other = await createSpace('other-hub');
    const theirs = await prisma.spaceShift.create({
      data: { spaceId: other.id, nameAr: 'صباحية', startsMinute: 480, endsMinute: 780 },
    });

    const response = await save({
      days: WEEK,
      shifts: [{ id: theirs.id, nameAr: 'صباحية', startsMinute: 480, endsMinute: 780 }],
    });

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ 'shifts.0.id': ['invalid_choice'] });
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses an invalid week with the shared rules', async () => {
    const response = await save({ days: WEEK.slice(1), shifts: [] });

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ days: ['too_short'] });
  });

  it('dates the hours at their first save, even with every day closed, and a repeat writes nothing', async () => {
    await prisma.space.update({ where: { id: spaceId }, data: { hoursUpdatedAt: null } });
    const closed = { days: Array(7).fill(null) as null[], shifts: [] };

    await save(closed);
    const first = await stored();
    await prisma.space.update({ where: { id: spaceId }, data: { hoursUpdatedAt: BEFORE } });
    const repeat = await save(closed);

    expect(first.hoursUpdatedAt).toEqual(NOW);
    expect(first.days.every(({ isClosed }) => isClosed)).toBe(true);
    expect(repeat.status).toBe(200);
    expect((await stored()).hoursUpdatedAt).toEqual(BEFORE);
    expect((await auditEntries()).map(({ action }) => action)).toEqual(['space.hoursEdited']);
  });

  it('refuses the admin once an owner has joined, writing nothing', async () => {
    await signInOwnerOf(spaceId);

    const response = await save({ days: WEEK, shifts: [] });

    expect(response.status).toBe(403);
    expect(errorOf(response).type).toBe('forbidden');
    expect(await stored()).toEqual({ days: [], shifts: [], hoursUpdatedAt: BEFORE });
    expect(await auditEntries()).toEqual([]);
  });

  it('answers not_found for a soft-deleted space and an unknown one', async () => {
    await prisma.space.update({ where: { id: spaceId }, data: { deletedAt: NOW } });

    expect((await save({ days: WEEK, shifts: [] })).status).toBe(404);
    expect((await save({ days: WEEK, shifts: [] }, 999)).status).toBe(404);
    expect(await prisma.spaceHours.count()).toBe(0);
  });
});
