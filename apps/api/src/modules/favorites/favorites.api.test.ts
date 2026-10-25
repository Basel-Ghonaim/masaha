import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { errorOf, signIn } from '../../../test/admin.ts';
import { lockUsers, waitingOnLock } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { createArea, createPublicSpace, seedSettings } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// A signed-in user saves and removes a listed space (docs/api/api-contract.md › Favourites), at
// most 200.
const NOW = new Date('2026-10-25T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });

let areaId: number;
let spaceId: number;
let user: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: areaId } = await createArea());
  ({ id: spaceId } = await createPublicSpace(areaId, 'Focus Hub'));
  user = await signIn('USER', 'saver@example.com');
});

function save(caller: { authorization: string } | null, id: number | string = spaceId) {
  const call = request(app).post(`/api/v1/me/favorites/${String(id)}`);
  return caller ? call.set('Authorization', caller.authorization) : call;
}

function remove(caller: { authorization: string } | null, id: number | string = spaceId) {
  const call = request(app).delete(`/api/v1/me/favorites/${String(id)}`);
  return caller ? call.set('Authorization', caller.authorization) : call;
}

const storedFavorites = () =>
  prisma.favorite.findMany({
    select: { userId: true, spaceId: true, createdAt: true },
    orderBy: [{ userId: 'asc' }, { spaceId: 'asc' }],
  });

/** `count` more listed spaces, in one statement, and the user's favourites of the first `saved`. */
async function savedSpaces(count: number, saved: number): Promise<number[]> {
  await prisma.space.createMany({
    data: Array.from({ length: count }, (_, index) => ({
      slug: `bulk-${String(index)}`,
      nameEn: `Bulk ${String(index)}`,
      addressAr: 'شارع الشهداء',
      areaId,
      lat: 31.52,
      lng: 34.45,
    })),
  });
  await prisma.$executeRaw`
    INSERT INTO favorites (user_id, space_id, created_at, updated_at)
    SELECT ${user.id}, id, ${NOW}, ${NOW} FROM spaces
    WHERE slug LIKE 'bulk-%' ORDER BY id LIMIT ${saved}`;
  const spaces = await prisma.space.findMany({
    where: { slug: { startsWith: 'bulk-' } },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  return spaces.map(({ id }) => id);
}

describe('POST /me/favorites/:spaceId', () => {
  it('a signed-in user saves a listed space, 204; again 204 with one row', async () => {
    const first = await save(user);
    expect(first.status).toBe(204);
    expect(first.body).toEqual({});
    expect(await storedFavorites()).toEqual([{ userId: user.id, spaceId, createdAt: NOW }]);

    const again = await save(user);
    expect(again.status).toBe(204);
    expect(await storedFavorites()).toEqual([{ userId: user.id, spaceId, createdAt: NOW }]);
  });

  it('two saves at once make one, both 204', async () => {
    let both: Promise<request.Response[]> | undefined;
    await prisma.$transaction(
      async (tx) => {
        // The user's row held, as another of their saves would hold it: both wait on it.
        await lockUsers(tx, user.id);
        both = Promise.all([save(user), save(user)]);
        await waitingOnLock({ count: 2 });
      },
      { timeout: 10_000 },
    );
    if (!both) throw new Error('The requests never started');
    const answers = await both;

    expect(answers.map(({ status }) => status)).toEqual([204, 204]);
    expect(await storedFavorites()).toHaveLength(1);
  });

  it('a hidden, deleted, unknown space, or one in an inactive area, is not saved: not_found', async () => {
    const hidden = await createPublicSpace(areaId, 'Hidden', { isHidden: true });
    const deleted = await createPublicSpace(areaId, 'Deleted', { deletedAt: NOW });
    const { id: closedArea } = await createArea({ areaActive: false });
    const farAway = await createPublicSpace(closedArea, 'Far Away');

    for (const id of [hidden.id, deleted.id, farAway.id, 999_999, 'abc']) {
      const response = await save(user, id);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    expect(await storedFavorites()).toEqual([]);
  });

  it('the 201st is FAVORITES_LIMIT_REACHED; one already saved at 200 answers 204', async () => {
    const ids = await savedSpaces(200, 200);
    expect(await prisma.favorite.count({ where: { userId: user.id } })).toBe(200);

    const full = await save(user);
    expect(full.status).toBe(409);
    expect(errorOf(full)).toMatchObject({ type: 'conflict', code: 'FAVORITES_LIMIT_REACHED' });

    const already = await save(user, ids[0] ?? 'missing');
    expect(already.status).toBe(204);
    expect(await prisma.favorite.count({ where: { userId: user.id } })).toBe(200);
  });

  it('two saves of different spaces at 199 at once: one 204, one FAVORITES_LIMIT_REACHED', async () => {
    const ids = await savedSpaces(200, 199);
    const last = ids[199] as number;

    let both: Promise<request.Response[]> | undefined;
    await prisma.$transaction(
      async (tx) => {
        await lockUsers(tx, user.id);
        both = Promise.all([save(user), save(user, last)]);
        await waitingOnLock({ count: 2 });
      },
      { timeout: 10_000 },
    );
    if (!both) throw new Error('The requests never started');
    const answers = await both;

    expect(answers.map(({ status }) => status).sort()).toEqual([204, 409]);
    const refused = answers.find(({ status }) => status === 409) as request.Response;
    expect(errorOf(refused).code).toBe('FAVORITES_LIMIT_REACHED');
    expect(await prisma.favorite.count({ where: { userId: user.id } })).toBe(200);
  });
});

describe('DELETE /me/favorites/:spaceId', () => {
  it("remove is 204 whether saved or not; another user's favourite stays", async () => {
    const other = await signIn('USER', 'other@example.com');
    expect((await save(user)).status).toBe(204);
    expect((await save(other)).status).toBe(204);

    const removed = await remove(user);
    expect(removed.status).toBe(204);
    expect(await storedFavorites()).toEqual([{ userId: other.id, spaceId, createdAt: NOW }]);

    expect((await remove(user)).status).toBe(204);
    // A space no longer listed is removed all the same.
    await prisma.space.update({ where: { id: spaceId }, data: { isHidden: true } });
    expect((await remove(other)).status).toBe(204);
    expect(await storedFavorites()).toEqual([]);
  });
});

describe('the favourites, anonymously', () => {
  it('anonymous is 401 on the three routes', async () => {
    for (const response of [await save(null), await remove(null)]) {
      expect(response.status).toBe(401);
    }
    expect(await storedFavorites()).toEqual([]);
  });
});
