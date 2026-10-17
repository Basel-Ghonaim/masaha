import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createSpace } from '../../../test/factories.ts';
import { image } from '../../../test/images.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { seedSettings, signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

const app = createTestApp();
let spaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };
let stranger: { id: number; authorization: string };
let unrelatedOwner: { id: number; authorization: string };
let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  stranger = await signIn('USER', 'stranger@example.com');
  unrelatedOwner = await signInOwnerOf((await createSpace('other-space')).id);
  admin = await signIn('ADMIN');
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
});

function manage(
  caller: { authorization: string },
  method: 'get' | 'post' | 'patch' | 'put' | 'delete',
  suffix = '',
  body?: object,
) {
  const path = `/api/v1/manage/spaces/${String(spaceId)}${suffix}`;
  const call = request(app)[method](path).set('Authorization', caller.authorization);
  return body ? call.send(body) : call;
}

const hours = { days: [null, null, null, null, null, null, null], shifts: [] };
const factRoutes = [
  { suffix: '/hours', body: hours },
  { suffix: '/prices', body: { prices: [] } },
  { suffix: '/amenities', body: { amenityIds: [], ownAmenities: [] } },
  { suffix: '/contacts', body: { contacts: [] } },
] as const;
const confirmRoutes = ['profile', 'hours', 'prices', 'amenities', 'contacts'] as const;

describe('managed space access', () => {
  it('lets the owner read and update, while reception can read only', async () => {
    expect((await manage(owner, 'get')).status).toBe(200);
    expect((await manage(owner, 'patch', '', { nameEn: 'Branch Hub' })).status).toBe(200);
    expect((await manage(reception, 'get')).status).toBe(200);

    const refused = await manage(reception, 'patch', '', { nameEn: 'Reception Edit' });
    expect(refused.status).toBe(403);
    expect(errorOf(refused).type).toBe('forbidden');
  });

  it('lets the owner update and confirm every profile and fact group', async () => {
    expect((await manage(owner, 'patch', '', { nameEn: 'Branch Hub' })).status).toBe(200);
    expect((await manage(owner, 'post', '/profile/confirm')).status).toBe(200);

    for (const route of factRoutes) {
      expect((await manage(owner, 'put', route.suffix, route.body)).status).toBe(200);
      expect((await manage(owner, 'post', `${route.suffix}/confirm`)).status).toBe(200);
    }
  });

  it('lets the owner list, upload, reorder and delete photos', async () => {
    expect((await manage(owner, 'get', '/photos')).status).toBe(200);
    const uploaded = await request(app)
      .post(`/api/v1/manage/spaces/${String(spaceId)}/photos`)
      .set('Authorization', owner.authorization)
      .attach('photo', await image('jpeg'), { filename: 'photo.jpg', contentType: 'image/jpeg' });
    expect(uploaded.status).toBe(201);
    const photoId = (uploaded.body as { data: { id: number } }).data.id;

    const reordered = await manage(owner, 'put', '/photos/order', { ids: [photoId] });
    expect(reordered.status).toBe(204);
    expect((await manage(owner, 'delete', `/photos/${String(photoId)}`)).status).toBe(204);
  });

  it('lets reception read photos but refuses every mutation', async () => {
    expect((await manage(reception, 'get', '/photos')).status).toBe(200);

    const writes = [
      ...factRoutes.map((route) => manage(reception, 'put', route.suffix, route.body)),
      ...confirmRoutes.map((group) => manage(reception, 'post', `/${group}/confirm`)),
      manage(reception, 'patch', '', { nameEn: 'Reception Edit' }),
      manage(reception, 'put', '/photos/order', { ids: [] }),
      manage(reception, 'delete', '/photos/1'),
    ];
    for (const response of await Promise.all(writes)) {
      expect(response.status).toBe(403);
      expect(errorOf(response).type).toBe('forbidden');
    }

    const upload = await request(app)
      .post(`/api/v1/manage/spaces/${String(spaceId)}/photos`)
      .set('Authorization', reception.authorization)
      .attach('photo', await image('jpeg'), { filename: 'photo.jpg', contentType: 'image/jpeg' });
    expect(upload.status).toBe(403);
  });

  it('refuses every protected route for strangers, unrelated owners and unlinked admins', async () => {
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const reads = [manage(caller, 'get'), manage(caller, 'get', '/photos')];
      for (const response of await Promise.all(reads)) {
        expect(response.status).toBe(404);
        expect(errorOf(response).type).toBe('not_found');
      }

      const writes = [
        ...factRoutes.map((route) => manage(caller, 'put', route.suffix, route.body)),
        ...confirmRoutes.map((group) => manage(caller, 'post', `/${group}/confirm`)),
        manage(caller, 'patch', '', { nameEn: 'Stranger Edit' }),
        manage(caller, 'put', '/photos/order', { ids: [] }),
        manage(caller, 'delete', '/photos/1'),
      ];
      for (const response of await Promise.all(writes)) {
        expect(response.status).toBe(404);
        expect(errorOf(response).type).toBe('not_found');
      }

      const upload = await request(app)
        .post(`/api/v1/manage/spaces/${String(spaceId)}/photos`)
        .set('Authorization', caller.authorization)
        .attach('photo', await image('jpeg'), { filename: 'photo.jpg', contentType: 'image/jpeg' });
      expect(upload.status).toBe(404);
    }
  });

  it('does not admit a deactivated link or a deleted space', async () => {
    await prisma.spaceManager.updateMany({
      where: { spaceId, userId: owner.id },
      data: { deactivatedAt: new Date() },
    });
    expect((await manage(owner, 'get')).status).toBe(404);

    await prisma.spaceManager.updateMany({
      where: { spaceId, userId: reception.id },
      data: { deactivatedAt: null },
    });
    await prisma.space.update({ where: { id: spaceId }, data: { deletedAt: new Date() } });
    expect((await manage(reception, 'get')).status).toBe(404);
  });
});

describe('managed photo writes', () => {
  const photos = () => `/api/v1/manage/spaces/${String(spaceId)}/photos`;
  const uploads = () => prisma.rateLimit.count({ where: { key: { startsWith: 'photo-upload:' } } });

  it('refuses reception’s photo writes before reading them, and counts no upload', async () => {
    const upload = await request(app).post(photos()).set('Authorization', reception.authorization);
    const reorder = await manage(reception, 'put', '/photos/order', { ids: 'all' });
    const removal = await manage(reception, 'delete', '/photos/abc');

    for (const response of [upload, reorder, removal]) {
      expect(response.status).toBe(403);
      expect(errorOf(response).type).toBe('forbidden');
    }
    expect(await uploads()).toBe(0);
  });

  it('counts an upload before reading its file: thirty unreadable uploads use the limit, and the next photo is refused 429', async () => {
    const path = photos();
    for (let i = 0; i < 30; i += 1) {
      const unreadable = await request(app)
        .post(path)
        .set('Authorization', owner.authorization)
        .attach('other', Buffer.from('x'), 'x.txt');
      expect(unreadable.status).toBe(400);
      expect(errorOf(unreadable).type).toBe('bad_request');
    }

    const response = await request(app)
      .post(path)
      .set('Authorization', owner.authorization)
      .attach('photo', await image('jpeg'), { filename: 'photo.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(429);
    expect(errorOf(response).type).toBe('rate_limit');
    expect(await prisma.spacePhoto.count()).toBe(0);
  });
});

describe('the managed read and its races', () => {
  it('answers the owner and reception the same whole space: its facts, its verification and its owners', async () => {
    await prisma.spaceHours.createMany({
      data: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        spaceId,
        dayOfWeek,
        isClosed: false,
        opensMinute: 480,
        closesMinute: 1080,
      })),
    });
    await prisma.space.update({ where: { id: spaceId }, data: { hoursUpdatedAt: new Date() } });

    const ownerRead = await manage(owner, 'get');
    const receptionRead = await manage(reception, 'get');

    expect(ownerRead.status).toBe(200);
    expect(dataOf(ownerRead)).toMatchObject({
      id: spaceId,
      isVerified: true,
      isHidden: false,
      owners: [{ id: owner.id, name: 'Ahmad' }],
      hours: {
        days: Array.from({ length: 7 }, () => ({ opensMinute: 480, closesMinute: 1080 })),
        shifts: [],
      },
      prices: [],
      amenityIds: [],
      ownAmenities: [],
      contacts: [],
      staleGroups: [],
      missingGroups: ['prices', 'amenities', 'contacts'],
    });
    expect(receptionRead.status).toBe(200);
    expect(dataOf(receptionRead)).toEqual(dataOf(ownerRead));
  });

  it('answers not_found for an unknown or malformed space id, and 401 to a guest', async () => {
    for (const id of ['999999', 'abc', '2147483648']) {
      const response = await request(app)
        .get(`/api/v1/manage/spaces/${id}`)
        .set('Authorization', owner.authorization);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }

    const guest = await request(app).get(`/api/v1/manage/spaces/${String(spaceId)}`);
    expect(guest.status).toBe(401);
    expect(errorOf(guest).type).toBe('unauthorized');
  });

  it('keeps a hidden space open to its owner and reception', async () => {
    await prisma.space.update({ where: { id: spaceId }, data: { isHidden: true } });

    const read = await manage(owner, 'get');
    expect(read.status).toBe(200);
    expect(dataOf(read)).toMatchObject({ isHidden: true });
    expect((await manage(owner, 'patch', '', { nameEn: 'Branch Hub' })).status).toBe(200);
    expect((await manage(reception, 'get')).status).toBe(200);
    expect((await manage(reception, 'get', '/photos')).status).toBe(200);
  });

  it('decides a managed save on the links under the space’s lock: an owner unlinked meanwhile is refused', async () => {
    // A link change in progress holds the space's lock, as every link change does, and ends the
    // owner's link only after the save has read the links and started waiting for the lock.
    const response = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`,
      () => manage(owner, 'put', '/contacts', { contacts: [] }),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: owner.id } },
          data: { deactivatedAt: new Date() },
        }),
    );

    expect(response.status).toBe(403);
    expect(errorOf(response).type).toBe('forbidden');
    const { contactsUpdatedAt } = await prisma.space.findUniqueOrThrow({ where: { id: spaceId } });
    expect(contactsUpdatedAt).toBeNull();
    expect(await auditEntries()).toEqual([]);
  });
});
