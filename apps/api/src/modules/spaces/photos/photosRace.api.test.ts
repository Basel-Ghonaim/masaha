import type { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { signIn } from '../../../../test/admin.ts';
import { createTestApp } from '../../../../test/app.ts';
import { createSpace } from '../../../../test/factories.ts';
import { image } from '../../../../test/images.ts';
import { whileHeld } from '../../../../test/locks.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { seedSettings } from '../../../../test/spaces.ts';
import { createTestStorage, type TestStorage } from '../../../../test/storage.ts';
import { prisma, type Tx } from '../../../db/index.ts';

// The races of an upload (conventions §13): it stores its files, then waits for the space's lock
// while another change holds it; it must decide on what that change committed, and leave no file
// when it is refused.

let files: TestStorage;
let app: Express;
let admin: { id: number; authorization: string };
let spaceId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  files = await createTestStorage();
  app = createTestApp({ storage: files.storage });
  admin = await signIn('ADMIN');
  ({ id: spaceId } = await createSpace());
});

afterEach(async () => {
  await files.cleanup();
});

/** Holds the space's row as every change of it does. */
function holdSpace(tx: Tx) {
  return tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;
}

async function uploadWhile(meanwhile: (tx: Tx) => Promise<unknown>) {
  const bytes = await image('jpeg');
  return whileHeld(
    holdSpace,
    () =>
      request(app)
        .post(`/api/v1/admin/spaces/${String(spaceId)}/photos`)
        .set('Authorization', admin.authorization)
        .attach('photo', bytes, { filename: 'photo.jpg', contentType: 'image/jpeg' }),
    meanwhile,
  );
}

describe('an upload racing another change of the space', () => {
  it('counts the photos under the space’s lock: one added meanwhile makes it the eleventh', async () => {
    for (let sortOrder = 0; sortOrder < 9; sortOrder += 1) {
      await prisma.spacePhoto.create({
        data: { spaceId, path: `seeded${String(sortOrder)}`, sortOrder },
      });
    }

    const answer = await uploadWhile((tx) =>
      tx.spacePhoto.create({ data: { spaceId, path: 'meanwhile', sortOrder: 9 } }),
    );

    expect(answer.status).toBe(409);
    expect(await prisma.spacePhoto.count({ where: { spaceId } })).toBe(10);
    expect(await files.files()).toEqual([]);
  });

  it('decides on the links under the space’s lock: an owner linked meanwhile refuses the admin', async () => {
    const owner = await prisma.user.create({
      data: { email: 'owner@example.com', name: 'Ahmad', role: 'OWNER', passwordHash: 'x' },
    });

    const answer = await uploadWhile((tx) =>
      tx.spaceManager.create({ data: { spaceId, userId: owner.id, role: 'OWNER' } }),
    );

    expect(answer.status).toBe(403);
    expect(await prisma.spacePhoto.count({ where: { spaceId } })).toBe(0);
    expect(await files.files()).toEqual([]);
  });
});
