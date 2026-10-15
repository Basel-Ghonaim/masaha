import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { errorOf, signIn } from '../../../test/admin.ts';
import { createSpace } from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { seedSettings, signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

const app = createTestApp();
let spaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };
let stranger: { id: number; authorization: string };
let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  stranger = await signIn('USER', 'stranger@example.com');
  admin = await signIn('ADMIN');
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
});

function manage(
  caller: { authorization: string },
  method: 'get' | 'patch',
  suffix = '',
  body?: object,
) {
  const path = `/api/v1/manage/spaces/${String(spaceId)}${suffix}`;
  const call = (method === 'get' ? request(app).get(path) : request(app).patch(path)).set(
    'Authorization',
    caller.authorization,
  );
  return body ? call.send(body) : call;
}

describe('managed space access', () => {
  it('lets the owner read and update, while reception can read only', async () => {
    expect((await manage(owner, 'get')).status).toBe(200);
    expect((await manage(owner, 'patch', '', { nameEn: 'Branch Hub' })).status).toBe(200);
    expect((await manage(reception, 'get')).status).toBe(200);

    const refused = await manage(reception, 'patch', '', { nameEn: 'Reception Edit' });
    expect(refused.status).toBe(403);
    expect(errorOf(refused).type).toBe('forbidden');
  });

  it('lets reception read photos but refuses photo changes', async () => {
    expect((await manage(reception, 'get', '/photos')).status).toBe(200);

    const refused = await request(app)
      .put(`/api/v1/manage/spaces/${String(spaceId)}/photos/order`)
      .set('Authorization', reception.authorization)
      .send({ ids: [] });
    expect(refused.status).toBe(403);
    expect(errorOf(refused).type).toBe('forbidden');
  });

  it('hides linked-space existence from strangers and unrelated globals', async () => {
    for (const caller of [stranger, admin]) {
      const response = await manage(caller, 'get');
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    expect((await manage(stranger, 'get', '/photos')).status).toBe(404);
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
