import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, signIn } from '../../../test/admin.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import {
  createArea,
  createPublicSpace,
  seedSettings,
  setWeek,
  signInOwnerOf,
} from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// A signed-in user's favourites, whole, as the directory's cards (docs/api/api-contract.md ›
// Favourites): newest saved first, or nearest first from the Masaha-Near header.
const NOW = new Date('2026-10-18T10:00:00+03:00');
const app = createTestApp({ clock: () => NOW });

/** Open 08:00–18:00 every day. */
const EVERY_DAY = Array.from({ length: 7 }, () => [8 * 60, 18 * 60] as [number, number]);

let areaId: number;
let user: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: areaId } = await createArea());
  user = await signIn('USER', 'saver@example.com');
});

/** The user's favourite of the space, saved at the time given. */
async function saved(userId: number, spaceId: number, at: string) {
  await prisma.favorite.create({ data: { userId, spaceId, createdAt: new Date(at) } });
}

function favorites(caller: { authorization: string } | null, query = '', near?: string) {
  const call = request(app).get(`/api/v1/me/favorites${query}`);
  const signed = caller ? call.set('Authorization', caller.authorization) : call;
  return near === undefined ? signed : signed.set('Masaha-Near', near);
}

type Favorite = { listed: boolean; savedAt: string; space: { id: number } };

describe('GET /me/favorites', () => {
  it('the favourites, whole, newest saved first: a listed space as its card with its live status; a deleted, hidden or inactive-area one listed false with its name', async () => {
    const open = await createPublicSpace(areaId, 'Open Room');
    await signInOwnerOf(open.id);
    await setWeek(open.id, EVERY_DAY);
    await prisma.spaceOccupancy.create({ data: { spaceId: open.id, capacity: 5 } });
    const plain = await createPublicSpace(areaId, 'Plain Room');
    const hidden = await createPublicSpace(areaId, 'Hidden', { isHidden: true, nameAr: 'مخفية' });
    const deleted = await createPublicSpace(areaId, 'Deleted', { deletedAt: NOW });
    const { id: closedArea } = await createArea({ areaActive: false });
    const farAway = await createPublicSpace(closedArea, 'Far Away');
    await saved(user.id, open.id, '2026-10-18T08:00:00+03:00');
    await saved(user.id, farAway.id, '2026-10-18T06:00:00+03:00');
    await saved(user.id, plain.id, '2026-10-18T09:00:00+03:00');
    await saved(user.id, hidden.id, '2026-10-18T07:00:00+03:00');
    await saved(user.id, deleted.id, '2026-10-18T09:30:00+03:00');

    const response = await favorites(user);

    expect(response.status).toBe(200);
    const listed = (await request(app).get('/api/v1/spaces').expect(200)).body as {
      data: { id: number; liveStatus: unknown }[];
    };
    const cardOf = (id: number) => listed.data.find((card) => card.id === id);
    expect(cardOf(open.id)?.liveStatus).toBe('AVAILABLE');
    expect(dataOf(response)).toEqual([
      {
        listed: false,
        savedAt: '2026-10-18T06:30:00.000Z',
        space: { id: deleted.id, nameEn: 'Deleted', nameAr: null },
      },
      { listed: true, savedAt: '2026-10-18T06:00:00.000Z', space: cardOf(plain.id) },
      { listed: true, savedAt: '2026-10-18T05:00:00.000Z', space: cardOf(open.id) },
      {
        listed: false,
        savedAt: '2026-10-18T04:00:00.000Z',
        space: { id: hidden.id, nameEn: 'Hidden', nameAr: 'مخفية' },
      },
      {
        listed: false,
        savedAt: '2026-10-18T03:00:00.000Z',
        space: { id: farAway.id, nameEn: 'Far Away', nameAr: null },
      },
    ]);
    expect(response.headers['cache-control']).not.toBe('no-store');
  });

  it('none saved is an empty list', async () => {
    const response = await favorites(user);

    expect(response.status).toBe(200);
    expect(dataOf(response)).toEqual([]);
  });

  it('sort=distance with Masaha-Near: nearest first with their distance, those that left last, no-store; the header without sort is invalid_choice on near', async () => {
    // From 31.500,34.450: 0.01° of latitude is about 1,112 m.
    const far = await createPublicSpace(areaId, 'Far', { lat: 31.53, lng: 34.45 });
    const near = await createPublicSpace(areaId, 'Near', { lat: 31.51, lng: 34.45 });
    const here = await createPublicSpace(areaId, 'Here', { lat: 31.5, lng: 34.45 });
    const gone = await createPublicSpace(areaId, 'Gone', { isHidden: true, lat: 31.5 });
    const older = await createPublicSpace(areaId, 'Older', { deletedAt: NOW, lat: 31.5 });
    await saved(user.id, here.id, '2026-10-18T06:00:00+03:00');
    await saved(user.id, gone.id, '2026-10-18T09:00:00+03:00');
    await saved(user.id, far.id, '2026-10-18T08:00:00+03:00');
    await saved(user.id, older.id, '2026-10-18T05:00:00+03:00');
    await saved(user.id, near.id, '2026-10-18T07:00:00+03:00');

    const response = await favorites(user, '?sort=distance', '31.500,34.450');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const rows = dataOf(response) as (Favorite & { space: { distanceMeters?: number } })[];
    expect(rows.map(({ listed, space }) => [space.id, listed, space.distanceMeters])).toEqual([
      [here.id, true, 0],
      [near.id, true, 1100],
      [far.id, true, 3300],
      [gone.id, false, undefined],
      [older.id, false, undefined],
    ]);

    const unordered = await favorites(user, '', '31.500,34.450');
    expect(unordered.status).toBe(422);
    expect(unordered.body).toMatchObject({ error: { errors: { near: ['invalid_choice'] } } });
    expect(unordered.headers['cache-control']).toBe('no-store');

    const missing = await favorites(user, '?sort=distance');
    expect(missing.status).toBe(422);
    expect(missing.body).toMatchObject({ error: { errors: { near: ['required'] } } });

    const anonymous = await favorites(null, '?sort=distance', '31.500,34.450');
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers['cache-control']).toBe('no-store');

    // Without the point, no card carries a distance.
    const plain = dataOf(await favorites(user)) as { space: object }[];
    for (const { space } of plain) expect(space).not.toHaveProperty('distanceMeters');
  });

  it("another user's favourites never; no card carries a capacity or a count", async () => {
    const mine = await createPublicSpace(areaId, 'Mine');
    await signInOwnerOf(mine.id);
    await setWeek(mine.id, EVERY_DAY);
    await prisma.spaceOccupancy.create({ data: { spaceId: mine.id, capacity: 5 } });
    const theirs = await createPublicSpace(areaId, 'Theirs');
    const other = await signIn('USER', 'other@example.com');
    await saved(user.id, mine.id, '2026-10-18T08:00:00+03:00');
    await saved(other.id, theirs.id, '2026-10-18T09:00:00+03:00');
    await saved(other.id, mine.id, '2026-10-18T09:00:00+03:00');

    const response = await favorites(user);

    expect((dataOf(response) as Favorite[]).map(({ space }) => space.id)).toEqual([mine.id]);
    expect((dataOf(response) as Favorite[])[0]?.savedAt).toBe('2026-10-18T05:00:00.000Z');
    expect(JSON.stringify(response.body)).not.toMatch(/capacity|count|present|occupied/i);
  });
});
