import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createSpace } from '../../../test/factories.ts';
import { waitingOnLock, whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

const NOW = new Date('2026-10-24T10:00:00+03:00');
const app = createTestApp({ clock: () => NOW });
const DAY = 86_400_000;
const days = (n: number) => new Date(NOW.getTime() + n * DAY).toISOString();

let spaceId: number;
let otherSpaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };
let stranger: { id: number; authorization: string };
let unrelatedOwner: { id: number; authorization: string };
let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  stranger = await signIn('USER', 'stranger@example.com');
  ({ id: otherSpaceId } = await createSpace('other-space'));
  unrelatedOwner = await signInOwnerOf(otherSpaceId);
  admin = await signIn('ADMIN');
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
});

const announcementsPath = (space = spaceId) =>
  `/api/v1/manage/spaces/${String(space)}/announcements`;

/** Posts an announcement as the caller, with this key (a new one unless given; `null` for none). */
function post(caller: { authorization: string }, body: object, key: string | null = randomUUID()) {
  const call = request(app).post(announcementsPath()).set('Authorization', caller.authorization);
  return (key === null ? call : call.set('Idempotency-Key', key)).send(body);
}

function edit(caller: { authorization: string }, announcementId: number, body: object) {
  return request(app)
    .patch(`${announcementsPath()}/${String(announcementId)}`)
    .set('Authorization', caller.authorization)
    .send(body);
}

/** An announcement of the space, inserted directly, with the fields under test overridden. */
function insert(data: object = {}) {
  return prisma.announcement.create({
    data: {
      spaceId,
      type: 'CLOSURE',
      textAr: 'مغلق',
      textEn: 'Closed',
      startsAt: new Date(days(-1)),
      idempotencyKey: randomUUID(),
      ...data,
    },
  });
}

const stored = () =>
  prisma.announcement.findMany({
    select: {
      id: true,
      spaceId: true,
      type: true,
      textAr: true,
      textEn: true,
      startsAt: true,
      endsAt: true,
      idempotencyKey: true,
    },
    orderBy: { id: 'asc' },
  });

const lockSpace = (tx: Pick<typeof prisma, '$queryRaw'>) =>
  tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;

describe('posting an announcement', () => {
  it('the owner and reception post an announcement, 201, its state, audited announcement.created', async () => {
    const key = randomUUID();
    const closure = await post(
      reception,
      { type: 'CLOSURE', textAr: ' مغلق اليوم\nللصيانة ', endsAt: '2026-10-24T18:00:00+03:00' },
      key,
    );
    expect(closure.status).toBe(201);
    const { id } = dataOf(closure) as { id: number };
    expect(dataOf(closure)).toEqual({
      id,
      type: 'CLOSURE',
      textAr: 'مغلق اليوم\nللصيانة',
      textEn: null,
      startsAt: NOW.toISOString(),
      endsAt: '2026-10-24T15:00:00.000Z',
      state: 'RUNNING',
    });

    const offer = await post(owner, {
      type: 'OFFER',
      textAr: 'خصم',
      textEn: 'A discount',
      startsAt: '2026-10-25T08:00:00+03:00',
    });
    expect(offer.status).toBe(201);
    expect(dataOf(offer)).toMatchObject({ textEn: 'A discount', endsAt: null, state: 'UPCOMING' });

    expect(await stored()).toEqual([
      {
        id,
        spaceId,
        type: 'CLOSURE',
        textAr: 'مغلق اليوم\nللصيانة',
        textEn: null,
        startsAt: NOW,
        endsAt: new Date('2026-10-24T15:00:00Z'),
        idempotencyKey: key,
      },
      expect.objectContaining({ type: 'OFFER' }) as unknown,
    ]);
    expect(await auditEntries()).toEqual([
      {
        actorId: reception.id,
        action: 'announcement.created',
        entityType: 'announcement',
        entityId: id,
        spaceId,
        before: null,
        after: {
          type: 'CLOSURE',
          startsAt: NOW.toISOString(),
          endsAt: '2026-10-24T15:00:00.000Z',
        },
      },
      expect.objectContaining({ actorId: owner.id, action: 'announcement.created' }) as unknown,
    ]);
  });

  it('a retry with the same key answers the first, 201; two at once with one key make one', async () => {
    const key = randomUUID();
    const first = await post(reception, { type: 'CLOSURE', textAr: 'مغلق' }, key);
    const retry = await post(reception, { type: 'CLOSURE', textAr: 'مغلق' }, key);
    expect([first.status, retry.status]).toEqual([201, 201]);
    expect(dataOf(retry)).toEqual(dataOf(first));
    expect(await stored()).toHaveLength(1);
    expect(await auditEntries()).toHaveLength(1);

    const together = randomUUID();
    const pending: Promise<request.Response>[] = [];
    // Both wait on the space's lock, so the second reads what the first committed.
    await prisma.$transaction(async (tx) => {
      await lockSpace(tx);
      pending.push(
        Promise.resolve(post(owner, { type: 'OUTAGE', textAr: 'انقطاع' }, together)),
        Promise.resolve(post(reception, { type: 'OUTAGE', textAr: 'انقطاع' }, together)),
      );
      await waitingOnLock({ count: 2 });
    });
    const [one, two] = await Promise.all(pending);
    expect([one?.status, two?.status]).toEqual([201, 201]);
    expect(dataOf(two as request.Response)).toEqual(dataOf(one as request.Response));
    expect(await stored()).toHaveLength(2);
  });

  it('a missing or invalid key, and an invalid body, are 422 before anything is read', async () => {
    const missing = await post(owner, { type: 'NEWS' }, null);
    expect(missing.status).toBe(422);
    expect(errorOf(missing).errors).toEqual({ idempotencyKey: ['required'] });

    const malformed = await post(owner, { type: 'GENERAL', textAr: 'نص' }, 'not-a-uuid');
    expect(malformed.status).toBe(422);
    expect(errorOf(malformed).errors).toEqual({ idempotencyKey: ['invalid_format'] });

    const invalid = await post(owner, { type: 'NEWS', textAr: '' });
    expect(invalid.status).toBe(422);
    expect(errorOf(invalid).errors).toEqual({ type: ['invalid_choice'], textAr: ['too_short'] });
    expect(await stored()).toEqual([]);
  });

  it("the period's refusals: an end before now, a start 31 days back, an end 366 days after the start, each 422 on its field, writing nothing", async () => {
    for (const [body, field] of [
      [{ endsAt: days(-0.5) }, 'endsAt'],
      [{ startsAt: days(-31) }, 'startsAt'],
      [{ startsAt: days(1), endsAt: days(367) }, 'endsAt'],
    ] as const) {
      const refused = await post(owner, { type: 'CLOSURE', textAr: 'مغلق', ...body });
      expect(refused.status).toBe(422);
      expect(errorOf(refused).errors).toEqual({ [field]: ['out_of_range'] });
    }
    expect(await stored()).toEqual([]);
    expect(await auditEntries()).toEqual([]);
  });

  it("a reception link ended while the post waits on the space's lock is refused 403, writing nothing", async () => {
    const response = await whileHeld(
      lockSpace,
      () => post(reception, { type: 'CLOSURE', textAr: 'مغلق' }),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: reception.id } },
          data: { deactivatedAt: new Date() },
        }),
    );

    expect(response.status).toBe(403);
    expect(await stored()).toEqual([]);
    expect(await auditEntries()).toEqual([]);
  });
});

describe('editing an announcement', () => {
  it('an edit changes only what it sends, audited with before and after; the same values write nothing; textEn null clears; endsAt null removes the end', async () => {
    const { id } = await insert({ endsAt: new Date(days(1)) });

    const text = await edit(reception, id, { type: 'CLOSURE', textAr: 'مغلق للصيانة' });
    expect(text.status).toBe(200);
    expect(dataOf(text)).toEqual({
      id,
      type: 'CLOSURE',
      textAr: 'مغلق للصيانة',
      textEn: 'Closed',
      startsAt: days(-1),
      endsAt: days(1),
      state: 'RUNNING',
    });

    const same = await edit(owner, id, { textAr: 'مغلق للصيانة', endsAt: days(1) });
    expect(same.status).toBe(200);
    expect(dataOf(same)).toEqual(dataOf(text));

    const cleared = await edit(owner, id, { textEn: null, endsAt: null });
    expect(cleared.status).toBe(200);
    expect(dataOf(cleared)).toMatchObject({ textEn: null, endsAt: null, state: 'RUNNING' });

    expect(await auditEntries()).toEqual([
      {
        actorId: reception.id,
        action: 'announcement.edited',
        entityType: 'announcement',
        entityId: id,
        spaceId,
        before: { textAr: 'مغلق' },
        after: { textAr: 'مغلق للصيانة' },
      },
      {
        actorId: owner.id,
        action: 'announcement.edited',
        entityType: 'announcement',
        entityId: id,
        spaceId,
        before: { textEn: 'Closed', endsAt: days(1) },
        after: { textEn: null, endsAt: null },
      },
    ]);
  });

  it("an ended one's text is edited, its end kept; a changed end before now, or a start moved past the end, is 422", async () => {
    const { id } = await insert({ endsAt: new Date(days(-0.5)) });
    expect(dataOf(await edit(owner, id, { textAr: 'انتهى' }))).toMatchObject({
      textAr: 'انتهى',
      state: 'ENDED',
    });

    const pastEnd = await edit(owner, id, { endsAt: days(-0.25) });
    expect(pastEnd.status).toBe(422);
    expect(errorOf(pastEnd).errors).toEqual({ endsAt: ['out_of_range'] });

    const upcoming = await insert({ startsAt: new Date(days(1)), endsAt: new Date(days(2)) });
    const pastStart = await edit(owner, upcoming.id, { startsAt: days(3) });
    expect(pastStart.status).toBe(422);
    expect(errorOf(pastStart).errors).toEqual({ endsAt: ['out_of_range'] });
    expect((await auditEntries()).map(({ action }) => action)).toEqual(['announcement.edited']);
  });

  it("another space's announcement, or none, is not_found; an invalid body is 422", async () => {
    const { id } = await insert();
    const theirs = await insert({ spaceId: otherSpaceId });

    const invalid = await edit(owner, id, { textAr: null });
    expect(invalid.status).toBe(422);
    expect(errorOf(invalid).errors).toEqual({ textAr: ['invalid_format'] });
    for (const announcementId of [theirs.id, 999_999]) {
      const response = await edit(owner, announcementId, { textAr: 'نص' });
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    expect(await auditEntries()).toEqual([]);
  });
});

describe("the announcements' routes", () => {
  it("a stranger, another space's owner and the admin get not_found on every route", async () => {
    const { id } = await insert();

    for (const caller of [stranger, unrelatedOwner, admin]) {
      for (const response of [
        await post(caller, { type: 'GENERAL', textAr: 'نص' }),
        await edit(caller, id, { textAr: 'نص' }),
        ...(await Promise.all(
          (['/end', '/start'] as const).map((action) =>
            request(app)
              .post(`${announcementsPath()}/${String(id)}${action}`)
              .set('Authorization', caller.authorization),
          ),
        )),
        await request(app)
          .delete(`${announcementsPath()}/${String(id)}`)
          .set('Authorization', caller.authorization),
      ]) {
        expect(response.status).toBe(404);
        expect(errorOf(response).type).toBe('not_found');
      }
    }
    expect(await stored()).toHaveLength(1);
    expect(await auditEntries()).toEqual([]);
  });
});
