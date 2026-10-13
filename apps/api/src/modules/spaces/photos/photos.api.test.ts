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
