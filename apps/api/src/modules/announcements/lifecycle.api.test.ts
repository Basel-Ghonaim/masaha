import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createSpace } from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

const NOW = new Date('2026-10-24T10:00:00+03:00');
const app = createTestApp({ clock: () => NOW });
const DAY = 86_400_000;
const days = (n: number) => new Date(NOW.getTime() + n * DAY);

let spaceId: number;
let otherSpaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  ({ id: otherSpaceId } = await createSpace('other-space'));
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
});

const announcementPath = (id: number, action = '') =>
  `/api/v1/manage/spaces/${String(spaceId)}/announcements/${String(id)}${action}`;

const act = (caller: { authorization: string }, id: number, action: '/end' | '/start') =>
  request(app).post(announcementPath(id, action)).set('Authorization', caller.authorization);

const remove = (caller: { authorization: string }, id: number) =>
  request(app).delete(announcementPath(id)).set('Authorization', caller.authorization);

/** An announcement of the space, inserted directly, with the fields under test overridden. */
function insert(data: object = {}) {
  return prisma.announcement.create({
    data: {
      spaceId,
      type: 'CLOSURE',
      textAr: 'مغلق',
      startsAt: days(-1),
      idempotencyKey: randomUUID(),
      ...data,
    },
  });
}

const storedOf = (id: number) =>
  prisma.announcement.findUniqueOrThrow({
    where: { id },
    select: { startsAt: true, endsAt: true, deletedAt: true },
  });

const liveStatus = async () =>
  (
    dataOf(
      await request(app)
        .get(`/api/v1/manage/spaces/${String(spaceId)}/occupancy`)
        .set('Authorization', owner.authorization),
    ) as { status: string | null }
  ).status;

describe('ending an announcement now', () => {
  it('end now sets the end to now on a running one, audited; an ended one answers as it is; an upcoming one is ANNOUNCEMENT_NOT_STARTED', async () => {
    const running = await insert({ endsAt: days(2) });
    const ended = await act(reception, running.id, '/end');
    expect(ended.status).toBe(200);
    expect(dataOf(ended)).toMatchObject({
      id: running.id,
      endsAt: NOW.toISOString(),
      state: 'ENDED',
    });
    expect(await storedOf(running.id)).toMatchObject({ endsAt: NOW });

    const again = await act(owner, running.id, '/end');
    expect(again.status).toBe(200);
    expect(dataOf(again)).toEqual(dataOf(ended));

    const upcoming = await insert({ startsAt: days(1) });
    const refused = await act(owner, upcoming.id, '/end');
    expect(refused.status).toBe(409);
    expect(errorOf(refused)).toMatchObject({ type: 'conflict', code: 'ANNOUNCEMENT_NOT_STARTED' });
    expect(await storedOf(upcoming.id)).toMatchObject({ endsAt: null });

    expect(await auditEntries()).toEqual([
      {
        actorId: reception.id,
        action: 'announcement.ended',
        entityType: 'announcement',
        entityId: running.id,
        spaceId,
        before: { endsAt: days(2).toISOString() },
        after: { endsAt: NOW.toISOString() },
      },
    ]);
  });
});

describe('starting an announcement now', () => {
  it('start now sets the start to now on an upcoming one, audited; a started one answers as it is, nothing audited', async () => {
    const upcoming = await insert({ type: 'OFFER', startsAt: days(1), endsAt: days(3) });
    const started = await act(owner, upcoming.id, '/start');
    expect(started.status).toBe(200);
    expect(dataOf(started)).toMatchObject({ startsAt: NOW.toISOString(), state: 'RUNNING' });

    const again = await act(reception, upcoming.id, '/start');
    expect(again.status).toBe(200);
    expect(dataOf(again)).toEqual(dataOf(started));

    const ended = await insert({ startsAt: days(-3), endsAt: days(-2) });
    expect(dataOf(await act(owner, ended.id, '/start'))).toMatchObject({
      startsAt: days(-3).toISOString(),
      state: 'ENDED',
    });

    expect(await auditEntries()).toEqual([
      {
        actorId: owner.id,
        action: 'announcement.started',
        entityType: 'announcement',
        entityId: upcoming.id,
        spaceId,
        before: { startsAt: days(1).toISOString() },
        after: { startsAt: NOW.toISOString() },
      },
    ]);
  });
});

describe('deleting an announcement', () => {
  it('delete is soft and 204, audited; again 204 writing nothing; then it leaves the list and the live status', async () => {
    const closure = await insert({ endsAt: days(2) });
    expect(await liveStatus()).toBe('CLOSED');

    const deleted = await remove(reception, closure.id);
    expect(deleted.status).toBe(204);
    expect(await storedOf(closure.id)).toMatchObject({ deletedAt: NOW, endsAt: days(2) });

    const again = await remove(owner, closure.id);
    expect(again.status).toBe(204);

    expect(await liveStatus()).toBeNull();
    const listed = await request(app)
      .get(`/api/v1/manage/spaces/${String(spaceId)}/announcements`)
      .set('Authorization', owner.authorization);
    expect(dataOf(listed)).toEqual([]);
    expect(await auditEntries()).toEqual([
      {
        actorId: reception.id,
        action: 'announcement.deleted',
        entityType: 'announcement',
        entityId: closure.id,
        spaceId,
        before: {
          type: 'CLOSURE',
          startsAt: days(-1).toISOString(),
          endsAt: days(2).toISOString(),
        },
        after: null,
      },
    ]);
  });
});

describe("a deleted or another space's announcement", () => {
  it("an edit, an end or a start of a deleted or another space's announcement is not_found", async () => {
    const deleted = await insert({ deletedAt: days(-0.5) });
    const theirs = await insert({ spaceId: otherSpaceId });

    for (const id of [deleted.id, theirs.id, 999_999]) {
      for (const response of [
        await request(app)
          .patch(announcementPath(id))
          .set('Authorization', owner.authorization)
          .send({ textAr: 'نص' }),
        await act(owner, id, '/end'),
        await act(owner, id, '/start'),
      ]) {
        expect(response.status).toBe(404);
        expect(errorOf(response).type).toBe('not_found');
      }
    }
    for (const id of [theirs.id, 999_999]) {
      const response = await remove(owner, id);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    expect(await storedOf(theirs.id)).toMatchObject({ deletedAt: null, endsAt: null });
    expect(await auditEntries()).toEqual([]);
  });
});
