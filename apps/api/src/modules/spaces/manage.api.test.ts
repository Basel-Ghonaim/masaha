import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { errorOf, signIn } from '../../../test/admin.ts';
import { createSpace } from '../../../test/factories.ts';
import { image } from '../../../test/images.ts';
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
