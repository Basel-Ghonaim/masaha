import { Writable } from 'node:stream';

import { PHOTO_MAX_BYTES } from '@masaha/shared/spaces';
import type { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  adminRequest,
  auditEntries,
  dataOf,
  errorOf,
  REFUSED_CALLERS,
  signIn,
} from '../../../../test/admin.ts';
import { createTestApp } from '../../../../test/app.ts';
import { createSpace } from '../../../../test/factories.ts';
import { describe as read, hasGps, image, jpegWithGps } from '../../../../test/images.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { seedSettings, signInOwnerOf } from '../../../../test/spaces.ts';
import { createTestStorage, failingStorage, type TestStorage } from '../../../../test/storage.ts';
import { prisma } from '../../../db/index.ts';
import { createLogger } from '../../../shared/http/index.ts';

const NOW = new Date('2026-10-13T09:00:00.000Z');
const BEFORE = new Date('2026-09-01T09:00:00.000Z');
const DATES = {
  profileUpdatedAt: BEFORE,
  hoursUpdatedAt: BEFORE,
  pricesUpdatedAt: BEFORE,
  amenitiesUpdatedAt: BEFORE,
  contactsUpdatedAt: BEFORE,
};

let files: TestStorage;
let app: Express;
let admin: { id: number; authorization: string };
let spaceId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  files = await createTestStorage();
  app = createTestApp({ clock: () => NOW, storage: files.storage });
  admin = await signIn('ADMIN');
  ({ id: spaceId } = await createSpace());
  await prisma.space.update({ where: { id: spaceId }, data: DATES });
});

afterEach(async () => {
  await files.cleanup();
});

interface Upload {
  caller?: { authorization: string };
  filename?: string;
  contentType?: string;
  target?: Express;
}

/** Sends `bytes` as the gallery does: one `photo` part of a multipart body. */
function upload(
  bytes: Buffer,
  { caller = admin, filename = 'photo.jpg', contentType = 'image/jpeg', target = app }: Upload = {},
) {
  return request(target)
    .post(`/api/v1/admin/spaces/${String(spaceId)}/photos`)
    .set('Authorization', caller.authorization)
    .attach('photo', bytes, { filename, contentType });
}

/** Photos already in the gallery, stored under made-up keys, in this order. */
async function seedPhotos(count: number) {
  const photos = [];
  for (let sortOrder = 0; sortOrder < count; sortOrder += 1) {
    photos.push(
      await prisma.spacePhoto.create({
        data: { spaceId, path: `seeded${String(sortOrder)}`, sortOrder },
      }),
    );
  }
  return photos;
}

/** The space's photo rows, in their order. */
function rows() {
  return prisma.spacePhoto.findMany({
    where: { spaceId },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, path: true, sortOrder: true },
  });
}

describe('POST /admin/spaces/:spaceId/photos', () => {
  it('stores a JPEG carrying a GPS position as WebP sizes with no metadata at all', async () => {
    const input = await jpegWithGps(1200, 900);
    // The test proves something only if what it uploads carries a position.
    expect(hasGps((await read(input)).exif)).toBe(true);

    const response = await upload(input);

    expect(response.status).toBe(201);
    const [row] = await rows();
    const key = row?.path ?? '';
    expect(key).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(dataOf(response)).toEqual({
      id: row?.id,
      urls: {
        card: `/api/v1/files/spaces/${key}/card.webp`,
        page: `/api/v1/files/spaces/${key}/page.webp`,
      },
    });
    expect(await files.files()).toEqual([`spaces/${key}/card.webp`, `spaces/${key}/page.webp`]);

    const { urls } = dataOf(response) as { urls: { card: string; page: string } };
    for (const [url, size] of [
      [urls.card, [640, 360]],
      [urls.page, [1200, 900]],
    ] as const) {
      const stored = await request(app).get(url).buffer(true);
      expect(stored.status).toBe(200);
      expect(stored.headers['content-type']).toBe('image/webp');
      const bytes = stored.body as Buffer;
      const metadata = await read(bytes);
      expect([metadata.format, metadata.width, metadata.height]).toEqual(['webp', ...size]);
      expect(metadata.exif).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
      expect(bytes.includes('Exif')).toBe(false);
      expect(bytes.includes('TestCam')).toBe(false);
    }
  });

  it.each([
    ['a PNG', 'png', 'image/png'],
    ['a WebP', 'webp', 'image/webp'],
  ] as const)('takes %s', async (_case, format, contentType) => {
    const response = await upload(await image(format), {
      filename: `photo.${format}`,
      contentType,
    });

    expect(response.status).toBe(201);
    expect(await files.files()).toHaveLength(2);
  });

  it('places a new photo last, and audits the gallery’s ids before and after', async () => {
    const [first] = await seedPhotos(1);

    const response = await upload(await image('jpeg'));

    const { id } = dataOf(response) as { id: number };
    expect((await rows()).map((row) => [row.id, row.sortOrder])).toEqual([
      [first?.id, 0],
      [id, 1],
    ]);
    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'space.photoAdded',
        entityType: 'space',
        entityId: spaceId,
        spaceId,
        before: { photoIds: [first?.id] },
        after: { photoIds: [first?.id, id] },
      },
    ]);
  });

  it('dates no fact group: a photo confirms nothing', async () => {
    await upload(await image('jpeg'));

    expect(await prisma.space.findUniqueOrThrow({ where: { id: spaceId } })).toMatchObject(DATES);
  });

  it('refuses a file that is not a JPEG, PNG or WebP, whatever its name and type say (415)', async () => {
    const response = await upload(Buffer.from('#!/bin/sh\necho not a photo\n'));

    expect(response.status).toBe(415);
    expect(errorOf(response).type).toBe('unsupported_media_type');
    expect(await rows()).toEqual([]);
    expect(await files.files()).toEqual([]);
  });

  it('refuses a file over 4 MiB (413), storing nothing', async () => {
    const response = await upload(Buffer.alloc(PHOTO_MAX_BYTES + 1, 0xff));

    expect(response.status).toBe(413);
    expect(errorOf(response).type).toBe('payload_too_large');
    expect(await rows()).toEqual([]);
    expect(await files.files()).toEqual([]);
  });

  it('asks for the photo when none is sent (422)', async () => {
    const empty = await adminRequest(app, admin, 'post', `/spaces/${String(spaceId)}/photos`);
    const json = await adminRequest(app, admin, 'post', `/spaces/${String(spaceId)}/photos`, {
      photo: 'x',
    });

    for (const response of [empty, json]) {
      expect(response.status).toBe(422);
      expect(errorOf(response).errors).toEqual({ photo: ['required'] });
    }
  });

  it('refuses a body with a second file or another part (400), storing nothing', async () => {
    const bytes = await image('jpeg');
    const path = `/api/v1/admin/spaces/${String(spaceId)}/photos`;

    const twoFiles = await request(app)
      .post(path)
      .set('Authorization', admin.authorization)
      .attach('photo', bytes, 'a.jpg')
      .attach('photo', bytes, 'b.jpg');
    const otherPart = await request(app)
      .post(path)
      .set('Authorization', admin.authorization)
      .field('caption', 'hello')
      .attach('photo', bytes, 'a.jpg');
    const otherName = await request(app)
      .post(path)
      .set('Authorization', admin.authorization)
      .attach('image', bytes, 'a.jpg');

    for (const response of [twoFiles, otherPart, otherName]) {
      expect(response.status).toBe(400);
    }
    expect(await rows()).toEqual([]);
    expect(await files.files()).toEqual([]);
  });

  it('takes a tenth photo and refuses an eleventh (409), storing nothing for it', async () => {
    await seedPhotos(9);

    const tenth = await upload(await image('jpeg'));
    const eleventh = await upload(await image('jpeg'));

    expect(tenth.status).toBe(201);
    expect(eleventh.status).toBe(409);
    expect(errorOf(eleventh)).toMatchObject({ type: 'conflict' });
    expect(errorOf(eleventh).code).toBeUndefined();
    expect(await rows()).toHaveLength(10);
    expect(await files.files()).toHaveLength(2);
  });

  it('answers 503 when the store fails, leaving no row and no file', async () => {
    const failing = createTestApp({
      clock: () => NOW,
      storage: failingStorage(files.storage, { failPut: /\/page\.webp$/ }),
    });

    const response = await upload(await image('jpeg'), { target: failing });

    expect(response.status).toBe(503);
    expect(errorOf(response).type).toBe('service_unavailable');
    expect(await rows()).toEqual([]);
    expect(await files.files()).toEqual([]);
  });

  it('refuses the admin once an owner has joined (403), storing nothing', async () => {
    await signInOwnerOf(spaceId);

    const response = await upload(await image('jpeg'));

    expect(response.status).toBe(403);
    expect(await rows()).toEqual([]);
    expect(await files.files()).toEqual([]);
  });

  it('answers not_found for a soft-deleted space, storing nothing', async () => {
    await prisma.space.update({ where: { id: spaceId }, data: { deletedAt: NOW } });

    const response = await upload(await image('jpeg'));

    expect(response.status).toBe(404);
    expect(await files.files()).toEqual([]);
  });

  it('refuses the space’s own owner on the admin’s router', async () => {
    const owner = await signInOwnerOf(spaceId);

    const response = await upload(await image('jpeg'), { caller: owner });

    expect(response.status).toBe(403);
  });

  it.each(REFUSED_CALLERS)('refuses $caller with $status', async ({ caller, ...refusal }) => {
    const response = await adminRequest(app, caller, 'post', `/spaces/${String(spaceId)}/photos`);

    expect(response.status).toBe(refusal.status);
    expect(errorOf(response)).toMatchObject({ type: refusal.type });
  });

  it('counts every upload by the user, and refuses the 31st in 15 minutes (429)', async () => {
    const path = `/spaces/${String(spaceId)}/photos`;
    for (let i = 0; i < 30; i += 1) {
      expect((await adminRequest(app, admin, 'post', path)).status).toBe(422);
    }

    const response = await upload(await image('jpeg'));

    expect(response.status).toBe(429);
    expect(await files.files()).toEqual([]);
  });

  it('counts an admin’s upload before reading its file: the next photo after thirty unreadable ones is refused 429', async () => {
    for (let i = 0; i < 30; i += 1) {
      const unreadable = await request(app)
        .post(`/api/v1/admin/spaces/${String(spaceId)}/photos`)
        .set('Authorization', admin.authorization)
        .attach('other', Buffer.from('x'), 'x.txt');
      expect(unreadable.status).toBe(400);
    }

    const response = await upload(await image('jpeg'));

    expect(response.status).toBe(429);
    expect(await files.files()).toEqual([]);
  });
});

describe('GET /admin/spaces/:spaceId/photos', () => {
  it('lists the photos in their order, the cover first, each with its sizes’ URLs', async () => {
    const [a, b, c] = await seedPhotos(3);
    await prisma.spacePhoto.update({ where: { id: a?.id }, data: { sortOrder: 2 } });
    await prisma.spacePhoto.update({ where: { id: c?.id }, data: { sortOrder: 0 } });

    const response = await adminRequest(app, admin, 'get', `/spaces/${String(spaceId)}/photos`);

    expect(response.status).toBe(200);
    expect(dataOf(response)).toEqual(
      [c, b, a].map((photo) => ({
        id: photo?.id,
        urls: {
          card: `/api/v1/files/spaces/${photo?.path ?? ''}/card.webp`,
          page: `/api/v1/files/spaces/${photo?.path ?? ''}/page.webp`,
        },
      })),
    );
  });

  it('lists a verified space’s photos to the admin, who cannot change them', async () => {
    await seedPhotos(1);
    await signInOwnerOf(spaceId);

    const response = await adminRequest(app, admin, 'get', `/spaces/${String(spaceId)}/photos`);

    expect(response.status).toBe(200);
    expect(dataOf(response)).toHaveLength(1);
  });

  it('answers not_found for a soft-deleted space and an unknown one', async () => {
    await prisma.space.update({ where: { id: spaceId }, data: { deletedAt: NOW } });

    const deleted = await adminRequest(app, admin, 'get', `/spaces/${String(spaceId)}/photos`);
    const unknown = await adminRequest(app, admin, 'get', `/spaces/${String(spaceId + 99)}/photos`);

    expect(deleted.status).toBe(404);
    expect(unknown.status).toBe(404);
  });

  it.each(REFUSED_CALLERS)('refuses $caller with $status', async ({ caller, ...refusal }) => {
    const response = await adminRequest(app, caller, 'get', `/spaces/${String(spaceId)}/photos`);

    expect(response.status).toBe(refusal.status);
    expect(errorOf(response)).toMatchObject({ type: refusal.type });
  });
});

/** Uploads `count` real photos, so each has its files, and answers them in order. */
async function uploadPhotos(count: number) {
  const photos: { id: number; key: string }[] = [];
  for (let i = 0; i < count; i += 1) {
    const response = await upload(await image('jpeg'));
    const { id } = dataOf(response) as { id: number };
    const { path } = await prisma.spacePhoto.findUniqueOrThrow({ where: { id } });
    photos.push({ id, key: path });
  }
  return photos;
}

function removePhoto(photoId: number, caller: { authorization: string } = admin) {
  return adminRequest(
    app,
    caller,
    'delete',
    `/spaces/${String(spaceId)}/photos/${String(photoId)}`,
  );
}

function reorder(ids: number[], caller: { authorization: string } = admin) {
  return adminRequest(app, caller, 'put', `/spaces/${String(spaceId)}/photos/order`, { ids });
}

/** The files a photo stored under `key` has. */
const filesOf = (key: string) => [`spaces/${key}/card.webp`, `spaces/${key}/page.webp`];

describe('DELETE /admin/spaces/:spaceId/photos/:photoId', () => {
  it('removes the photo and its files, closes up the order, and audits the ids', async () => {
    const [a, b, c] = await uploadPhotos(3);
    if (!a || !b || !c) throw new Error('Three photos were uploaded');
    await prisma.auditLog.deleteMany();

    const response = await removePhoto(b.id);

    expect(response.status).toBe(204);
    expect((await rows()).map((row) => [row.id, row.sortOrder])).toEqual([
      [a.id, 0],
      [c.id, 1],
    ]);
    expect(await files.files()).toEqual([...filesOf(a.key), ...filesOf(c.key)].sort());
    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'space.photoRemoved',
        entityType: 'space',
        entityId: spaceId,
        spaceId,
        before: { photoIds: [a.id, b.id, c.id] },
        after: { photoIds: [a.id, c.id] },
      },
    ]);
    expect(await prisma.space.findUniqueOrThrow({ where: { id: spaceId } })).toMatchObject(DATES);
  });

  it('writes nothing for a photo the space does not have, and answers as if removed', async () => {
    await uploadPhotos(1);
    const { id: otherSpace } = await createSpace('other-space');
    const other = await prisma.spacePhoto.create({
      data: { spaceId: otherSpace, path: 'elsewhere', sortOrder: 0 },
    });
    await prisma.auditLog.deleteMany();

    const response = await removePhoto(other.id);
    const unknown = await removePhoto(other.id + 1000);

    expect(response.status).toBe(204);
    expect(unknown.status).toBe(204);
    expect(await prisma.spacePhoto.count()).toBe(2);
    expect(await files.files()).toHaveLength(2);
    expect(await auditEntries()).toEqual([]);
  });

  it('answers 204 when its files cannot be removed, and logs them as left behind', async () => {
    const [photo] = await uploadPhotos(1);
    if (!photo) throw new Error('A photo was uploaded');
    const lines: string[] = [];
    const logged = createTestApp({
      clock: () => NOW,
      storage: failingStorage(files.storage, { failRemove: /./ }),
      logger: createLogger(
        'warn',
        new Writable({
          write(chunk: Buffer, _encoding, done) {
            lines.push(chunk.toString());
            done();
          },
        }),
      ),
    });

    const response = await adminRequest(
      logged,
      admin,
      'delete',
      `/spaces/${String(spaceId)}/photos/${String(photo.id)}`,
    );

    expect(response.status).toBe(204);
    expect(await rows()).toEqual([]);
    const line = lines.find((text) => text.includes('[storage:orphan]'));
    expect(line).toContain(`spaces/${photo.key}/card.webp`);
  });

  it('refuses the admin once an owner has joined (403), removing nothing', async () => {
    const [photo] = await uploadPhotos(1);
    await signInOwnerOf(spaceId);

    const response = await removePhoto(photo?.id ?? 0);

    expect(response.status).toBe(403);
    expect(await rows()).toHaveLength(1);
    expect(await files.files()).toHaveLength(2);
  });

  it('answers not_found for a soft-deleted space', async () => {
    const [photo] = await uploadPhotos(1);
    await prisma.space.update({ where: { id: spaceId }, data: { deletedAt: NOW } });

    expect((await removePhoto(photo?.id ?? 0)).status).toBe(404);
  });

  it.each(REFUSED_CALLERS)('refuses $caller with $status', async ({ caller, ...refusal }) => {
    const response = await adminRequest(
      app,
      caller,
      'delete',
      `/spaces/${String(spaceId)}/photos/1`,
    );

    expect(response.status).toBe(refusal.status);
  });
});

describe('PUT /admin/spaces/:spaceId/photos/order', () => {
  it('puts the photos in the order given, the first the cover, and audits the ids', async () => {
    const [a, b, c] = await seedPhotos(3);
    if (!a || !b || !c) throw new Error('Three photos were seeded');

    const response = await reorder([c.id, a.id, b.id]);

    expect(response.status).toBe(204);
    const listed = await adminRequest(app, admin, 'get', `/spaces/${String(spaceId)}/photos`);
    expect((dataOf(listed) as { id: number }[]).map(({ id }) => id)).toEqual([c.id, a.id, b.id]);
    expect((await rows()).map((row) => row.sortOrder)).toEqual([0, 1, 2]);
    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'space.photosReordered',
        entityType: 'space',
        entityId: spaceId,
        spaceId,
        before: { photoIds: [a.id, b.id, c.id] },
        after: { photoIds: [c.id, a.id, b.id] },
      },
    ]);
    expect(await prisma.space.findUniqueOrThrow({ where: { id: spaceId } })).toMatchObject(DATES);
  });

  it('writes nothing for the order the gallery already has', async () => {
    const photos = await seedPhotos(2);

    const response = await reorder(photos.map(({ id }) => id));

    expect(response.status).toBe(204);
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses ids that are not exactly the space’s photos (409), writing nothing', async () => {
    const [a, b] = await seedPhotos(2);
    if (!a || !b) throw new Error('Two photos were seeded');
    const { id: otherSpace } = await createSpace('other-space');
    const other = await prisma.spacePhoto.create({
      data: { spaceId: otherSpace, path: 'elsewhere', sortOrder: 0 },
    });

    for (const ids of [[a.id], [a.id, b.id, other.id], [a.id, a.id], [b.id, other.id]]) {
      const response = await reorder(ids);
      expect(response.status).toBe(409);
      expect(errorOf(response).code).toBeUndefined();
    }
    expect((await rows()).map((row) => row.id)).toEqual([a.id, b.id]);
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses a body without ids, or with more than ten (422)', async () => {
    const path = `/spaces/${String(spaceId)}/photos/order`;
    const missing = await adminRequest(app, admin, 'put', path, {});
    const eleven = await reorder(Array.from({ length: 11 }, (_, i) => i + 1));

    expect(errorOf(missing).errors).toEqual({ ids: ['required'] });
    expect(errorOf(eleven).errors).toEqual({ ids: ['too_long'] });
  });

  it('refuses the admin once an owner has joined (403)', async () => {
    const photos = await seedPhotos(2);
    await signInOwnerOf(spaceId);

    const response = await reorder(photos.map(({ id }) => id).reverse());

    expect(response.status).toBe(403);
  });

  it.each(REFUSED_CALLERS)('refuses $caller with $status', async ({ caller, ...refusal }) => {
    const path = `/spaces/${String(spaceId)}/photos/order`;
    const response = await adminRequest(app, caller, 'put', path, { ids: [] });

    expect(response.status).toBe(refusal.status);
  });
});
