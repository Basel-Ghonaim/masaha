import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { accessTokens, createAccount, createTestApp } from '../../../test/app.ts';
import { createSpace } from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../../db/index.ts';
import type { Role } from '../../generated/prisma/enums.ts';

const app = createTestApp();

beforeEach(async () => {
  await resetDatabase(prisma);
});

async function tokenFor(user: { id: number; role: Role }) {
  return accessTokens.sign({ userId: user.id, role: user.role, mustChangePassword: false });
}

async function mySpaces(user?: { id: number; role: Role }) {
  const call = request(app).get('/api/v1/manage/spaces');
  return user ? call.set('Authorization', `Bearer ${await tokenFor(user)}`) : call;
}

/** The slugs of the spaces an answer lists, in its order. */
function slugsOf(response: request.Response): string[] {
  return (response.body as { data: { slug: string }[] }).data.map(({ slug }) => slug);
}

/** A link of `user` to `space`, created at `day` so the test fixes the links' order. */
function link(
  user: { id: number },
  space: { id: number },
  role: 'OWNER' | 'RECEPTION',
  day: string,
  deactivatedAt: Date | null = null,
) {
  return prisma.spaceManager.create({
    data: {
      userId: user.id,
      spaceId: space.id,
      role,
      createdAt: new Date(`${day}T09:00:00Z`),
      deactivatedAt,
    },
  });
}

describe('GET /manage/spaces', () => {
  it('lists the caller’s active links’ spaces, with the role, the names and each one’s own area', async () => {
    const owner = await createAccount({ role: 'OWNER' });
    const hub = await createSpace('hub');
    await prisma.space.update({ where: { id: hub.id }, data: { nameEn: 'Focus Hub' } });
    const nook = await createSpace('nook');
    const { governorateId } = await prisma.area.findUniqueOrThrow({ where: { id: nook.areaId } });
    const rimal = await prisma.area.create({
      data: { governorateId, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
    });
    await prisma.space.update({ where: { id: nook.id }, data: { areaId: rimal.id } });
    await link(owner, hub, 'OWNER', '2026-01-01');
    await link(owner, nook, 'RECEPTION', '2026-02-01');

    const response = await mySpaces(owner);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [
        {
          spaceId: hub.id,
          role: 'OWNER',
          slug: 'hub',
          nameAr: 'فوكس هاب',
          nameEn: 'Focus Hub',
          area: { nameAr: 'النصر', nameEn: 'An-Nasr' },
        },
        {
          spaceId: nook.id,
          role: 'RECEPTION',
          slug: 'nook',
          nameAr: 'فوكس هاب',
          nameEn: null,
          area: { nameAr: 'الرمال', nameEn: 'Al-Rimal' },
        },
      ],
    });
  });

  it('orders the spaces by link, oldest first, whatever the spaces’ own order', async () => {
    const user = await createAccount();
    const first = await createSpace('first');
    const second = await createSpace('second');
    const third = await createSpace('third');
    await link(user, third, 'OWNER', '2026-01-01');
    await link(user, first, 'RECEPTION', '2026-02-01');
    await link(user, second, 'OWNER', '2026-03-01');

    const response = await mySpaces(user);

    expect(slugsOf(response)).toEqual(['third', 'first', 'second']);
  });

  it('leaves out a deactivated link', async () => {
    const user = await createAccount();
    const kept = await createSpace('kept');
    const ended = await createSpace('ended');
    await link(user, kept, 'RECEPTION', '2026-01-01');
    await link(user, ended, 'RECEPTION', '2026-02-01', new Date('2026-03-01T09:00:00Z'));

    const response = await mySpaces(user);

    expect(slugsOf(response)).toEqual(['kept']);
  });

  it('leaves out a soft-deleted space and includes a hidden one', async () => {
    const owner = await createAccount({ role: 'OWNER' });
    const hidden = await createSpace('hidden');
    const deleted = await createSpace('deleted');
    await prisma.space.update({ where: { id: hidden.id }, data: { isHidden: true } });
    await prisma.space.update({ where: { id: deleted.id }, data: { deletedAt: new Date() } });
    await link(owner, hidden, 'OWNER', '2026-01-01');
    await link(owner, deleted, 'OWNER', '2026-02-01');

    const response = await mySpaces(owner);

    expect(slugsOf(response)).toEqual(['hidden']);
  });

  it('never shows another user’s spaces', async () => {
    const sara = await createAccount({ role: 'OWNER' });
    const omar = await createAccount({ email: 'omar@example.com', role: 'OWNER' });
    const sarasSpace = await createSpace('saras');
    const omarsSpace = await createSpace('omars');
    await link(sara, sarasSpace, 'OWNER', '2026-01-01');
    await link(omar, omarsSpace, 'OWNER', '2026-01-01');

    const response = await mySpaces(sara);

    expect(slugsOf(response)).toEqual(['saras']);
  });

  it('answers an empty list to a USER with no links', async () => {
    const user = await createAccount();

    expect((await mySpaces(user)).body).toEqual({ success: true, data: [] });
  });

  it('answers an empty list to an ADMIN with no links', async () => {
    const admin = await createAccount({ email: 'admin@example.com', role: 'ADMIN' });
    await createSpace('someone-elses');

    expect((await mySpaces(admin)).body).toEqual({ success: true, data: [] });
  });

  it('refuses a user whose temporary password is pending with 403 PASSWORD_CHANGE_REQUIRED', async () => {
    const user = await createAccount({ mustChangePassword: true });
    await link(user, await createSpace('pending'), 'RECEPTION', '2026-01-01');
    const token = await accessTokens.sign({
      userId: user.id,
      role: user.role,
      mustChangePassword: true,
    });

    const response = await request(app)
      .get('/api/v1/manage/spaces')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false,
      error: { type: 'forbidden', code: 'PASSWORD_CHANGE_REQUIRED' },
    });
  });

  it('refuses a guest with 401', async () => {
    const response = await mySpaces();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false, error: { type: 'unauthorized' } });
  });
});
