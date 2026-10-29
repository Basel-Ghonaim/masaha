import { createHash, randomBytes } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { errorOf } from '../../../test/admin.ts';
import {
  accessTokens,
  cookieValue,
  createAccount,
  createTestApp,
  PASSWORD,
} from '../../../test/app.ts';
import { createSpace } from '../../../test/factories.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../../db/index.ts';

// Reception's session ends after 15 minutes with no request (docs/backend/security.md › Tokens and
// cookies). Each test signs in through the API, so the clock dates the session; the access token's
// own 15 minutes run on the real clock, which these tests never reach.
const SIGNED_IN = new Date('2026-10-21T07:00:00Z');
const MINUTE = 60_000;
let now = SIGNED_IN;
const app = createTestApp({ clock: () => now });
const at = (ms: number) => new Date(SIGNED_IN.getTime() + ms);

let spaceId: number;
let otherSpaceId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  now = SIGNED_IN;
  ({ id: spaceId } = await createSpace());
  ({ id: otherSpaceId } = await createSpace('other-space'));
});

interface Device {
  userId: number;
  authorization: string;
  refreshToken: string;
  sessionId: number;
}

/** An account with these links (and role), signed in through the API on a device of its own. */
async function account(
  email: string,
  links: readonly ['OWNER' | 'RECEPTION', number][],
  role: 'USER' | 'OWNER' | 'ADMIN' = 'USER',
) {
  const user = await createAccount({ email, role });
  for (const [linkRole, linkSpaceId] of links) {
    await prisma.spaceManager.create({
      data: { spaceId: linkSpaceId, userId: user.id, role: linkRole },
    });
  }
  return user;
}

async function signIn(email: string): Promise<Device> {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: PASSWORD });
  expect(response.status).toBe(200);
  const { accessToken, user } = (
    response.body as { data: { accessToken: string; user: { id: number } } }
  ).data;
  const claims = await accessTokens.verify(accessToken);
  const refreshToken = cookieValue(response, 'masaha_refresh');
  if (!claims || !refreshToken) throw new Error('The sign-in answered no session');
  return {
    userId: user.id,
    authorization: `Bearer ${accessToken}`,
    refreshToken,
    sessionId: claims.sessionId,
  };
}

/** A request that counts as activity: the account's spaces. */
function me(device: Device, when: Date) {
  now = when;
  return request(app).get('/api/v1/manage/spaces').set('Authorization', device.authorization);
}

/** The desk's state, polled every 30 seconds: passive, it renews nothing. */
function poll(device: Device, when: Date) {
  now = when;
  return request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/occupancy`)
    .set('Authorization', device.authorization);
}

function refresh(device: Device, when: Date) {
  now = when;
  return request(app)
    .post('/api/v1/auth/refresh')
    .set('Cookie', `masaha_refresh=${device.refreshToken}`);
}

async function lastActivityOf(device: Device) {
  const rows = await prisma.refreshToken.findMany({
    where: { familyId: device.sessionId },
    select: { lastActivityAt: true },
  });
  return rows.map(({ lastActivityAt }) => lastActivityAt.toISOString());
}

function familySize(device: Device) {
  return prisma.refreshToken.count({ where: { familyId: device.sessionId } });
}

function expectIdle(response: request.Response) {
  expect(response.status).toBe(401);
  expect(errorOf(response)).toMatchObject({ type: 'unauthorized', code: 'SESSION_IDLE' });
}

describe("reception's idle session", () => {
  it('renews a session used within 15 minutes, and refuses one idle longer, keeping it for the refresh', async () => {
    await account('nour@example.com', [['RECEPTION', spaceId]]);
    const desk = await signIn('nour@example.com');

    const used = at(14 * MINUTE + 59_000);
    expect((await me(desk, used)).status).toBe(200);
    expect(await lastActivityOf(desk)).toEqual([used.toISOString()]);

    expectIdle(await me(desk, new Date(used.getTime() + 15 * MINUTE + 1_000)));
    expect(await familySize(desk)).toBe(1);
  });

  it("ends the idle session on its refresh, clearing the cookies, and leaves the person's other device", async () => {
    await account('nour@example.com', [['RECEPTION', spaceId]]);
    const desk = await signIn('nour@example.com');
    const phone = await signIn('nour@example.com');
    const { sessionVersion } = await prisma.user.findUniqueOrThrow({
      where: { id: desk.userId },
    });
    expect((await me(phone, at(10 * MINUTE))).status).toBe(200);

    const later = at(15 * MINUTE + 1_000);
    expectIdle(await me(desk, later));
    const refused = await refresh(desk, later);

    expectIdle(refused);
    expect(cookieValue(refused, 'masaha_refresh')).toBe('');
    expect(cookieValue(refused, 'masaha_session')).toBe('');
    expect(await familySize(desk)).toBe(0);
    expect((await me(phone, at(20 * MINUTE))).status).toBe(200);
    expect(await familySize(phone)).toBe(1);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: desk.userId } })).sessionVersion,
    ).toBe(sessionVersion);
  });

  it('renews nothing on a refresh: the new token keeps the session’s last activity', async () => {
    await account('nour@example.com', [['RECEPTION', spaceId]]);
    const desk = await signIn('nour@example.com');

    const refreshed = await refresh(desk, at(10 * MINUTE));
    expect(refreshed.status).toBe(200);
    const { accessToken } = (refreshed.body as { data: { accessToken: string } }).data;
    const newest = await prisma.refreshToken.findFirstOrThrow({
      where: { familyId: desk.sessionId },
      orderBy: { id: 'desc' },
      select: { lastActivityAt: true },
    });
    expect(newest.lastActivityAt.toISOString()).toBe(SIGNED_IN.toISOString());

    expectIdle(
      await me({ ...desk, authorization: `Bearer ${accessToken}` }, at(15 * MINUTE + 1_000)),
    );
  });

  it('ends a desk left open: the polled state renews nothing', async () => {
    await account('nour@example.com', [['RECEPTION', spaceId]]);
    const desk = await signIn('nour@example.com');

    for (let seconds = 30; seconds <= 15 * 60; seconds += 30) {
      expect((await poll(desk, at(seconds * 1_000))).status).toBe(200);
    }
    expect(await lastActivityOf(desk)).toEqual([SIGNED_IN.toISOString()]);

    expectIdle(await me(desk, at(15 * MINUTE + 30_000)));
  });

  it('never ends an owner’s session, one who is reception elsewhere, or the admin’s, idle two hours', async () => {
    await account('owner@example.com', [['OWNER', spaceId]], 'OWNER');
    await account(
      'both@example.com',
      [
        ['OWNER', spaceId],
        ['RECEPTION', otherSpaceId],
      ],
      'OWNER',
    );
    await account('admin@example.com', [['RECEPTION', spaceId]], 'ADMIN');

    for (const email of ['owner@example.com', 'both@example.com', 'admin@example.com']) {
      now = SIGNED_IN;
      const device = await signIn(email);
      expect((await me(device, at(120 * MINUTE))).status).toBe(200);
      expect((await refresh(device, at(121 * MINUTE))).status).toBe(200);
    }
  });

  it('writes the renewal at most once a minute', async () => {
    await account('nour@example.com', [['RECEPTION', spaceId]]);
    const desk = await signIn('nour@example.com');

    await me(desk, at(10_000));
    await me(desk, at(30_000));
    expect(await lastActivityOf(desk)).toEqual([SIGNED_IN.toISOString()]);

    await me(desk, at(61_000));
    expect(await lastActivityOf(desk)).toEqual([at(61_000).toISOString()]);
  });

  it("a request's renewal racing a rotation leaves the new session active", async () => {
    await account('nour@example.com', [['RECEPTION', spaceId]]);
    const desk = await signIn('nour@example.com');
    const nextToken = randomBytes(32).toString('base64url');
    const used = at(10 * MINUTE);

    // A refresh's transaction (finding 170): the new row inserted with the presented row's last
    // use, the presented row marked rotated, so locked. The request's renewal waits on that row,
    // cannot see the new one, and renews the presented row alone once the refresh commits.
    const renewed = await whileHeld(
      async (tx) => {
        const presented = await tx.refreshToken.findFirstOrThrow({
          where: { familyId: desk.sessionId },
        });
        const next = await tx.refreshToken.create({
          data: {
            userId: desk.userId,
            familyId: desk.sessionId,
            tokenHash: createHash('sha256').update(nextToken).digest('hex'),
            expiresAt: presented.expiresAt,
            sessionEndsAt: presented.sessionEndsAt,
            lastActivityAt: presented.lastActivityAt,
          },
        });
        await tx.refreshToken.update({
          where: { id: presented.id },
          data: { rotatedAt: used, replacedById: next.id },
        });
      },
      () => me(desk, used),
      () => Promise.resolve(),
    );
    expect(renewed.status).toBe(200);
    expect((await lastActivityOf(desk)).sort()).toEqual(
      [SIGNED_IN.toISOString(), used.toISOString()].sort(),
    );

    // Twenty minutes in: ten since the renewal, so neither the refresh nor a request is idle, and
    // the refresh copies the renewal into the token it issues.
    const later = at(20 * MINUTE);
    expect((await refresh({ ...desk, refreshToken: nextToken }, later)).status).toBe(200);
    const newest = await prisma.refreshToken.findFirstOrThrow({
      where: { familyId: desk.sessionId },
      orderBy: { id: 'desc' },
      select: { lastActivityAt: true },
    });
    expect(newest.lastActivityAt.toISOString()).toBe(used.toISOString());
    expect((await me(desk, later)).status).toBe(200);
  });

  it('refuses a reception token whose session was signed out', async () => {
    await account('nour@example.com', [['RECEPTION', spaceId]]);
    const desk = await signIn('nour@example.com');
    const out = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `masaha_refresh=${desk.refreshToken}`);
    expect(out.status).toBeLessThan(300);

    const response = await me(desk, at(MINUTE));

    expect(response.status).toBe(401);
    expect(errorOf(response).code).toBeUndefined();
  });
});
