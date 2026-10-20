import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import {
  createCheckIn,
  createCustomer,
  createSubscription,
  createVisit,
  stay,
} from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import {
  createArea,
  createPublicSpace,
  seedSettings,
  setWeek,
  signInOwnerOf,
} from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

/** A time on Sunday 2026-10-18 in Gaza, UTC+3 until 2026-10-24. */
const sunday = (time: string) => new Date(`2026-10-18T${time}:00+03:00`);
const app = createTestApp({ clock: () => sunday('10:00') });

/** Open 08:00–18:00 every day. */
const EVERY_DAY = Array.from({ length: 7 }, () => [8 * 60, 18 * 60] as [number, number]);

let areaId: number;

/** A listed space with the hours, the capacity and the owner given. */
async function space(
  nameEn: string,
  {
    week = EVERY_DAY,
    capacity,
    verified = true,
  }: { week?: ([number, number] | null)[]; capacity?: number; verified?: boolean } = {},
) {
  const created = await createPublicSpace(areaId, nameEn);
  if (verified) await signInOwnerOf(created.id);
  await setWeek(created.id, week);
  if (capacity !== undefined) {
    await prisma.spaceOccupancy.create({ data: { spaceId: created.id, capacity } });
  }
  return created;
}

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: areaId } = await createArea());

  // AVAILABLE: one open visit of two seats; its closed visit and closed check-in count for nothing.
  const open = await space('Open Room', { capacity: 2 });
  await createVisit(open.id, { checkedInAt: sunday('09:00') });
  await createVisit(open.id, stay('2026-10-18', '08:00', '09:00'));
  const left = await createSubscription(await createCustomer(open.id, { name: 'Huda' }));
  await createCheckIn(left, stay('2026-10-18', '08:00', '09:30'));
  // FULL: one open subscription check-in of one seat.
  const full = await space('Full Room', { capacity: 1 });
  const subscription = await createSubscription(await createCustomer(full.id));
  await createCheckIn(subscription, { checkedInAt: sunday('09:30') });
  // CLOSED: closed on Sundays.
  await space('Closed Room', {
    capacity: 5,
    week: EVERY_DAY.map((day, i) => (i === 0 ? null : day)),
  });
  // No live state: no capacity; or unverified.
  await space('No Capacity');
  await space('Unverified', { capacity: 5, verified: false });
  await space('Second Open', { capacity: 5 });
});

/** Each listed item's live status, by its English name. */
function statusesOf(items: readonly { nameEn: string; liveStatus: unknown }[]) {
  return Object.fromEntries(items.map(({ nameEn, liveStatus }) => [nameEn, liveStatus]));
}

const EXPECTED = {
  'Open Room': 'AVAILABLE',
  'Full Room': 'FULL',
  'Closed Room': 'CLOSED',
  'No Capacity': null,
  Unverified: null,
  'Second Open': 'AVAILABLE',
};

describe('the live status in the directory', () => {
  it("every card and pin carries its live status; an unverified space's is null", async () => {
    const list = await request(app).get('/api/v1/spaces?limit=50');
    expect(list.status).toBe(200);
    expect(
      statusesOf((list.body as { data: { nameEn: string; liveStatus: unknown }[] }).data),
    ).toEqual(EXPECTED);

    const map = await request(app).get('/api/v1/map/spaces');
    expect(map.status).toBe(200);
    const { pins } = (map.body as { data: { pins: { nameEn: string; liveStatus: unknown }[] } })
      .data;
    expect(statusesOf(pins)).toEqual(EXPECTED);
  });

  it('no public answer carries a capacity, a count or an override', async () => {
    const list = await request(app).get('/api/v1/spaces?limit=1');
    const [card] = (list.body as { data: object[] }).data;
    expect(Object.keys(card ?? {}).sort()).toEqual(
      [
        'area',
        'cover',
        'days',
        'id',
        'isVerified',
        'liveStatus',
        'nameAr',
        'nameEn',
        'slug',
      ].sort(),
    );

    const map = await request(app).get('/api/v1/map/spaces');
    const [pin] = (map.body as { data: { pins: object[] } }).data.pins;
    expect(Object.keys(pin ?? {}).sort()).toEqual(
      [
        'areaId',
        'cover',
        'days',
        'id',
        'isVerified',
        'liveStatus',
        'location',
        'nameAr',
        'nameEn',
        'slug',
      ].sort(),
    );

    const page = await request(app).get('/api/v1/spaces/open-room');
    expect(Object.keys((page.body as { data: object }).data).sort()).toEqual(
      [
        'addressAr',
        'addressEn',
        'amenities',
        'area',
        'contacts',
        'descriptionAr',
        'descriptionEn',
        'hours',
        'id',
        'isVerified',
        'landmarkAr',
        'landmarkEn',
        'location',
        'nameAr',
        'nameEn',
        'photos',
        'prices',
        'slug',
        'staleGroups',
        'updatedAt',
      ].sort(),
    );

    const occupancy = await request(app).get('/api/v1/spaces/open-room/occupancy');
    expect(occupancy.body).toEqual({ success: true, data: { status: 'AVAILABLE' } });
  });

  it('availableNow keeps only AVAILABLE spaces, before the page is cut: every page full, the total right', async () => {
    const names: string[] = [];
    for (const page of [1, 2]) {
      const response = await request(app).get(
        `/api/v1/spaces?availableNow=true&limit=1&page=${String(page)}`,
      );
      expect(response.status).toBe(200);
      const body = response.body as {
        data: { nameEn: string; liveStatus: unknown }[];
        meta: { totalRecords: number; totalPages: number };
      };
      expect(body.data).toHaveLength(1);
      expect(body.meta).toMatchObject({ totalRecords: 2, totalPages: 2 });
      names.push(...body.data.map(({ nameEn }) => nameEn));
      expect(body.data.map(({ liveStatus }) => liveStatus)).toEqual(['AVAILABLE']);
    }
    expect(names.sort()).toEqual(['Open Room', 'Second Open']);

    // Not asked for, every listed space.
    const all = await request(app).get('/api/v1/spaces?availableNow=false&limit=50');
    expect((all.body as { meta: { totalRecords: number } }).meta.totalRecords).toBe(6);
  });

  it('a closure in force closes a space and an override in force gives its state, on the card, the pin and /occupancy', async () => {
    // Open now with seats free: AVAILABLE but for the closure, and but for the override.
    const closed = await space('Closure Room', { capacity: 5 });
    await prisma.announcement.create({
      data: { spaceId: closed.id, type: 'CLOSURE', textAr: 'مغلق', startsAt: sunday('08:00') },
    });
    const overridden = await space('Override Room');
    await prisma.spaceOccupancy.create({
      data: {
        spaceId: overridden.id,
        capacity: 5,
        stateOverride: 'FULL',
        stateOverrideUntil: sunday('11:00'),
        stateOverrideById: (
          await prisma.spaceManager.findFirstOrThrow({
            where: { spaceId: overridden.id },
          })
        ).userId,
      },
    });
    const expected = { 'Closure Room': 'CLOSED', 'Override Room': 'FULL' };

    const list = await request(app).get('/api/v1/spaces?limit=50');
    expect(
      statusesOf((list.body as { data: { nameEn: string; liveStatus: unknown }[] }).data),
    ).toMatchObject(expected);
    const map = await request(app).get('/api/v1/map/spaces');
    const { pins } = (map.body as { data: { pins: { nameEn: string; liveStatus: unknown }[] } })
      .data;
    expect(statusesOf(pins)).toMatchObject(expected);

    for (const [slug, status] of [
      ['closure-room', 'CLOSED'],
      ['override-room', 'FULL'],
    ] as const) {
      const response = await request(app).get(`/api/v1/spaces/${slug}/occupancy`);
      expect(response.body).toEqual({ success: true, data: { status } });
    }
  });

  it('availableNow on the map keeps the same spaces', async () => {
    const response = await request(app).get('/api/v1/map/spaces?availableNow=true');
    expect(response.status).toBe(200);
    const { pins } = (response.body as { data: { pins: { nameEn: string }[] } }).data;
    expect(pins.map(({ nameEn }) => nameEn).sort()).toEqual(['Open Room', 'Second Open']);
  });

  it('GET /spaces/:slug/occupancy answers { status } for a listed space, with the public cache; 404 for a hidden, deleted or unknown one', async () => {
    const shown = await request(app).get('/api/v1/spaces/full-room/occupancy');
    expect(shown.status).toBe(200);
    expect(shown.body).toEqual({ success: true, data: { status: 'FULL' } });
    expect(shown.headers['cache-control']).toBe('public, max-age=30');

    const unverified = await request(app).get('/api/v1/spaces/unverified/occupancy');
    expect(unverified.body).toEqual({ success: true, data: { status: null } });

    await prisma.space.update({ where: { slug: 'open-room' }, data: { isHidden: true } });
    await prisma.space.update({ where: { slug: 'second-open' }, data: { deletedAt: new Date() } });
    for (const slug of ['open-room', 'second-open', 'nowhere']) {
      const response = await request(app).get(`/api/v1/spaces/${slug}/occupancy`);
      expect(response.status).toBe(404);
      expect((response.body as { error: { type: string } }).error.type).toBe('not_found');
    }
  });
});
