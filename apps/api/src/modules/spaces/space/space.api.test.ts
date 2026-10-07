import { Writable } from 'node:stream';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { accessTokens, createTestApp } from '../../../../test/app.ts';
import { adminRequest, auditEntries, dataOf, errorOf, signIn } from '../../../../test/admin.ts';
import { createSpace } from '../../../../test/factories.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { seedSettings, signInOwnerOf } from '../../../../test/spaces.ts';
import { prisma } from '../../../db/index.ts';
import { createLogger } from '../../../shared/http/index.ts';

const NOW = new Date('2026-10-06T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });
const DAY_MS = 24 * 60 * 60 * 1000;

let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  admin = await signIn('ADMIN');
});

/** A space whose every fact group was dated `days` ago. */
async function spaceDated(days: number, slug = 'focus-hub') {
  const at = new Date(NOW.getTime() - days * DAY_MS);
  const { id } = await createSpace(slug);
  return prisma.space.update({
    where: { id },
    data: {
      profileUpdatedAt: at,
      hoursUpdatedAt: at,
      pricesUpdatedAt: at,
      amenitiesUpdatedAt: at,
      contactsUpdatedAt: at,
    },
  });
}

/** A link of a new user to the space. */
async function link(spaceId: number, role: 'OWNER' | 'RECEPTION', deactivated = false) {
  const user = await prisma.user.create({
    data: {
      email: `${role.toLowerCase()}-${String(spaceId)}@example.com`,
      name: 'Sara',
      passwordHash: 'x',
    },
  });
  await prisma.spaceManager.create({
    data: { spaceId, userId: user.id, role, deactivatedAt: deactivated ? NOW : null },
  });
  return user;
}

const path = (spaceId: number, rest = '') => `/spaces/${String(spaceId)}${rest}`;

// Every endpoint on one space, proven for each caller testing.md §4 names.
describe.each([
  { name: 'GET /spaces/:spaceId', method: 'get', rest: '', body: undefined, status: 200 },
  {
    name: 'PATCH /spaces/:spaceId',
    method: 'patch',
    rest: '',
    body: { nameEn: 'Branch Hub' },
    status: 200,
  },
  {
    name: 'PUT /spaces/:spaceId/hidden',
    method: 'put',
    rest: '/hidden',
    body: { isHidden: true },
    status: 204,
  },
  { name: 'DELETE /spaces/:spaceId', method: 'delete', rest: '', body: undefined, status: 204 },
  {
    name: 'POST /spaces/:spaceId/restore',
    method: 'post',
    rest: '/restore',
    body: undefined,
    status: 204,
  },
  ...(['profile', 'hours', 'prices', 'amenities', 'contacts'] as const).map(
    (group) =>
      ({
        name: `POST /spaces/:spaceId/${group}/confirm`,
        method: 'post',
        rest: `/${group}/confirm`,
        body: undefined,
        status: 200,
      }) as const,
  ),
] as const)('$name', ({ method, rest, body, status }) => {
  it('answers the ADMIN', async () => {
    const space = await spaceDated(1);

    const response = await adminRequest(app, admin, method, path(space.id, rest), body);

    expect(response.status).toBe(status);
  });

  it.each([
    { caller: 'a guest', status: 401, type: 'unauthorized', code: undefined },
    { caller: 'a USER', status: 403, type: 'forbidden', code: undefined },
    { caller: 'the OWNER of another space', status: 403, type: 'forbidden', code: undefined },
    { caller: 'the OWNER of this space', status: 403, type: 'forbidden', code: undefined },
    {
      caller: 'an ADMIN with a pending password change',
      status: 403,
      type: 'forbidden',
      code: 'PASSWORD_CHANGE_REQUIRED',
    },
  ] as const)('refuses $caller with $status, changing nothing', async (refusal) => {
    const space = await spaceDated(1);
    const caller = {
      'a guest': () => Promise.resolve(undefined),
      'a USER': () => signIn('USER'),
      'the OWNER of another space': async () => signInOwnerOf((await createSpace('their-hub')).id),
      'the OWNER of this space': () => signInOwnerOf(space.id),
      'an ADMIN with a pending password change': () =>
        signIn('ADMIN with a pending password change'),
    }[refusal.caller];
    const signedIn = await caller();

    const response = await adminRequest(
      app,
      signedIn ?? 'guest',
      method,
      path(space.id, rest),
      body,
    );

    expect(response.status).toBe(refusal.status);
    const error = errorOf(response);
    expect({ type: error.type, code: error.code }).toEqual({
      type: refusal.type,
      code: refusal.code,
    });
    expect(await auditEntries()).toEqual([]);
    expect(await prisma.space.findUniqueOrThrow({ where: { id: space.id } })).toMatchObject({
      nameEn: 'Focus Hub',
      isHidden: false,
      deletedAt: null,
      profileUpdatedAt: space.profileUpdatedAt,
      hoursUpdatedAt: space.hoursUpdatedAt,
      pricesUpdatedAt: space.pricesUpdatedAt,
      amenitiesUpdatedAt: space.amenitiesUpdatedAt,
      contactsUpdatedAt: space.contactsUpdatedAt,
    });
  });
});

describe('GET /admin/spaces/:spaceId', () => {
  it('answers the space with its profile, its freshness and its stale groups', async () => {
    const space = await spaceDated(31);

    const response = await adminRequest(app, admin, 'get', path(space.id));

    const at = new Date(NOW.getTime() - 31 * DAY_MS).toISOString();
    expect(dataOf(response)).toEqual({
      id: space.id,
      slug: 'focus-hub',
      nameEn: 'Focus Hub',
      nameAr: 'فوكس هاب',
      descriptionAr: null,
      descriptionEn: null,
      areaId: space.areaId,
      addressAr: 'غرب المزنر',
      addressEn: null,
      landmarkAr: null,
      landmarkEn: null,
      location: { lat: 31.53, lng: 34.46 },
      isHidden: false,
      isVerified: false,
      updatedAt: { profile: at, hours: at, prices: at, amenities: at, contacts: at },
      staleGroups: ['prices'],
      missingGroups: [],
    });
  });

  it.each([
    ['an active owner', 'OWNER', false, true],
    ['only a reception account', 'RECEPTION', false, false],
    ['only a deactivated owner', 'OWNER', true, false],
  ] as const)(
    'says whether it is verified: with %s, %s',
    async (_case, role, deactivated, verified) => {
      const space = await createSpace();
      await link(space.id, role, deactivated);

      const response = await adminRequest(app, admin, 'get', path(space.id));

      expect((dataOf(response) as { isVerified: boolean }).isVerified).toBe(verified);
    },
  );

  it.each([
    [
      'a soft-deleted space',
      async () => {
        const space = await createSpace();
        await prisma.space.update({ where: { id: space.id }, data: { deletedAt: NOW } });
        return path(space.id);
      },
    ],
    ['an unknown space', () => Promise.resolve(path(999))],
    ['an id that names no row', () => Promise.resolve('/spaces/abc')],
  ])('answers not_found for %s', async (_case, pathOf) => {
    const response = await adminRequest(app, admin, 'get', await pathOf());

    expect(response.status).toBe(404);
    expect(errorOf(response).type).toBe('not_found');
  });

  it('names the space in the request’s log line (conventions §10)', async () => {
    const lines: string[] = [];
    const logged = createTestApp({
      clock: () => NOW,
      logger: createLogger(
        'info',
        new Writable({
          write(chunk: Buffer, _encoding, done) {
            lines.push(chunk.toString());
            done();
          },
        }),
      ),
    });
    const space = await createSpace();

    const response = await adminRequest(logged, admin, 'get', path(space.id));

    const id = String(response.headers['x-request-id']);
    const line = lines
      .map((text) => JSON.parse(text) as { req?: { id?: string }; spaceId?: number })
      .find((entry) => entry.req?.id === id);
    expect(line).toMatchObject({ userId: admin.id, role: 'ADMIN', spaceId: space.id });
  });
});

describe('PUT /admin/spaces/:spaceId/hidden', () => {
  it('hides a verified space and shows it again, auditing each, and a repeat changes nothing', async () => {
    const space = await createSpace();
    await link(space.id, 'OWNER');

    await adminRequest(app, admin, 'put', path(space.id, '/hidden'), { isHidden: true });
    const repeat = await adminRequest(app, admin, 'put', path(space.id, '/hidden'), {
      isHidden: true,
    });
    expect(repeat.status).toBe(204);
    expect((await prisma.space.findUniqueOrThrow({ where: { id: space.id } })).isHidden).toBe(true);
    await adminRequest(app, admin, 'put', path(space.id, '/hidden'), { isHidden: false });

    const entry = { actorId: admin.id, entityType: 'space', entityId: space.id, spaceId: space.id };
    expect(await auditEntries()).toEqual([
      { ...entry, action: 'space.hidden', before: { isHidden: false }, after: { isHidden: true } },
      {
        ...entry,
        action: 'space.unhidden',
        before: { isHidden: true },
        after: { isHidden: false },
      },
    ]);
    expect((await prisma.space.findUniqueOrThrow({ where: { id: space.id } })).isHidden).toBe(
      false,
    );
  });

  it('answers not_found for a soft-deleted space', async () => {
    const space = await createSpace();
    await prisma.space.update({ where: { id: space.id }, data: { deletedAt: NOW } });

    const response = await adminRequest(app, admin, 'put', path(space.id, '/hidden'), {
      isHidden: true,
    });

    expect(response.status).toBe(404);
  });

  it('requires the flag', async () => {
    const space = await createSpace();

    const response = await adminRequest(app, admin, 'put', path(space.id, '/hidden'), {});

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ isHidden: ['required'] });
  });
});

describe('DELETE and restore of /admin/spaces/:spaceId', () => {
  it('soft-deletes a verified space, keeping its links, and a repeat changes nothing', async () => {
    const space = await createSpace();
    await link(space.id, 'OWNER');

    const deleted = await adminRequest(app, admin, 'delete', path(space.id));
    const repeat = await adminRequest(app, admin, 'delete', path(space.id));

    expect([deleted.status, repeat.status]).toEqual([204, 204]);
    expect((await prisma.space.findUniqueOrThrow({ where: { id: space.id } })).deletedAt).toEqual(
      NOW,
    );
    expect(
      await prisma.spaceManager.findMany({
        where: { spaceId: space.id },
        select: { role: true, deactivatedAt: true },
      }),
    ).toEqual([{ role: 'OWNER', deactivatedAt: null }]);
    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'space.deleted',
        entityType: 'space',
        entityId: space.id,
        spaceId: space.id,
        before: { deletedAt: null },
        after: { deletedAt: NOW.toISOString() },
      },
    ]);
    expect((await adminRequest(app, admin, 'get', path(space.id))).status).toBe(404);
  });

  it('restores a deleted space as it was, hidden or not', async () => {
    const space = await createSpace();
    await link(space.id, 'OWNER');
    await prisma.space.update({
      where: { id: space.id },
      data: { isHidden: true, deletedAt: NOW },
    });

    const restored = await adminRequest(app, admin, 'post', path(space.id, '/restore'));
    const repeat = await adminRequest(app, admin, 'post', path(space.id, '/restore'));

    expect([restored.status, repeat.status]).toEqual([204, 204]);
    expect(await prisma.space.findUniqueOrThrow({ where: { id: space.id } })).toMatchObject({
      isHidden: true,
      deletedAt: null,
    });
    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'space.restored',
        entityType: 'space',
        entityId: space.id,
        spaceId: space.id,
        before: { deletedAt: NOW.toISOString() },
        after: { deletedAt: null },
      },
    ]);
  });

  it('takes the space from its owner when deleted, and gives it back when restored', async () => {
    const space = await createSpace();
    const owner = await link(space.id, 'OWNER');
    const token = await accessTokens.sign({
      userId: owner.id,
      role: 'OWNER',
      mustChangePassword: false,
    });
    const mySpaces = async () => {
      const response = await request(app)
        .get('/api/v1/manage/spaces')
        .set('Authorization', `Bearer ${token}`);
      return (dataOf(response) as { spaceId: number }[]).map(({ spaceId }) => spaceId);
    };

    await adminRequest(app, admin, 'delete', path(space.id));
    const whileDeleted = await mySpaces();
    await adminRequest(app, admin, 'post', path(space.id, '/restore'));

    expect(whileDeleted).toEqual([]);
    expect(await mySpaces()).toEqual([space.id]);
  });

  it('answers not_found for an unknown space, deleted or restored', async () => {
    expect((await adminRequest(app, admin, 'delete', path(999))).status).toBe(404);
    expect((await adminRequest(app, admin, 'post', path(999, '/restore'))).status).toBe(404);
  });
});
