import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createSpace } from '../../../test/factories.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { setWeek, signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

/** A time on Sunday 2026-10-18 in Gaza, UTC+3 until 2026-10-24. */
const sunday = (time: string) => new Date(`2026-10-18T${time}:00+03:00`);
const app = createTestApp({ clock: () => sunday('10:00') });

/** Open 08:00–18:00 every day. */
const EVERY_DAY = Array.from({ length: 7 }, () => [8 * 60, 18 * 60] as [number, number]);

let spaceId: number;
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
  const { id: otherSpaceId } = await createSpace('other-space');
  unrelatedOwner = await signInOwnerOf(otherSpaceId);
  admin = await signIn('ADMIN');
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
});

/** Sets the override as the caller, through `app` unless another is given. */
function setOverride(caller: { authorization: string }, body: object, through = app) {
  return request(through)
    .put(`/api/v1/manage/spaces/${String(spaceId)}/status-override`)
    .set('Authorization', caller.authorization)
    .send(body);
}

/** Clears the override as the caller. */
function clearOverride(caller: { authorization: string }, through = app) {
  return request(through)
    .delete(`/api/v1/manage/spaces/${String(spaceId)}/status-override`)
    .set('Authorization', caller.authorization);
}

/** The space's occupancy row, or null when it has none. */
function storedOccupancy() {
  return prisma.spaceOccupancy.findUnique({
    where: { spaceId },
    select: {
      capacity: true,
      stateOverride: true,
      stateOverrideUntil: true,
      stateOverrideById: true,
    },
  });
}

describe("a space's live-status override", () => {
  it('the owner and reception set an override for 30 minutes, ending at now + 30 min, audited', async () => {
    await setWeek(spaceId, EVERY_DAY);

    for (const caller of [owner, reception]) {
      await prisma.spaceOccupancy.deleteMany();
      await prisma.auditLog.deleteMany();

      const response = await setOverride(caller, { state: 'FULL', duration: 'MINUTES_30' });
      expect(response.status).toBe(200);
      expect(dataOf(response)).toEqual({
        status: 'FULL',
        capacity: null,
        present: 0,
        override: { state: 'FULL', until: '2026-10-18T07:30:00.000Z' },
        people: [],
      });
      expect(await storedOccupancy()).toEqual({
        capacity: null,
        stateOverride: 'FULL',
        stateOverrideUntil: sunday('10:30'),
        stateOverrideById: caller.id,
      });
      expect(await auditEntries()).toEqual([
        {
          actorId: caller.id,
          action: 'space.statusOverridden',
          entityType: 'space',
          entityId: spaceId,
          spaceId,
          before: null,
          after: { state: 'FULL', until: '2026-10-18T07:30:00.000Z' },
        },
      ]);
    }
  });

  it("an override asked for 2 hours ends at today's closing when closing is sooner", async () => {
    await setWeek(spaceId, EVERY_DAY);
    const late = createTestApp({ clock: () => sunday('17:00') });

    const response = await setOverride(owner, { state: 'CLOSED', duration: 'HOURS_2' }, late);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      status: 'CLOSED',
      override: { state: 'CLOSED', until: '2026-10-18T15:00:00.000Z' },
    });

    const untilClosing = await setOverride(
      owner,
      { state: 'AVAILABLE', duration: 'UNTIL_CLOSING' },
      late,
    );
    expect(dataOf(untilClosing)).toMatchObject({
      override: { state: 'AVAILABLE', until: '2026-10-18T15:00:00.000Z' },
    });
  });

  it('a new override replaces the one in force, audited with both', async () => {
    await setWeek(spaceId, EVERY_DAY);
    await setOverride(owner, { state: 'FULL', duration: 'MINUTES_30' });

    const replaced = await setOverride(reception, { state: 'CLOSED', duration: 'HOUR_1' });
    expect(replaced.status).toBe(200);
    expect(await storedOccupancy()).toEqual({
      capacity: null,
      stateOverride: 'CLOSED',
      stateOverrideUntil: sunday('11:00'),
      stateOverrideById: reception.id,
    });
    const entries = await auditEntries();
    expect(
      entries.map(({ actorId, action, before, after }) => ({ actorId, action, before, after })),
    ).toEqual([
      {
        actorId: owner.id,
        action: 'space.statusOverridden',
        before: null,
        after: { state: 'FULL', until: '2026-10-18T07:30:00.000Z' },
      },
      {
        actorId: reception.id,
        action: 'space.statusOverridden',
        before: { state: 'FULL', until: '2026-10-18T07:30:00.000Z' },
        after: { state: 'CLOSED', until: '2026-10-18T08:00:00.000Z' },
      },
    ]);
  });

  it('refuses an override while the space is not open by its hours, or has none: 409 SPACE_NOT_OPEN, writing nothing', async () => {
    const body = { state: 'AVAILABLE', duration: 'HOUR_1' };
    const refusedThrough = async (through: typeof app) => {
      const response = await setOverride(owner, body, through);
      expect(response.status).toBe(409);
      expect(errorOf(response).type).toBe('conflict');
      expect(errorOf(response).code).toBe('SPACE_NOT_OPEN');
    };

    // No hours at all.
    await refusedThrough(app);

    // After closing, and before opening.
    await setWeek(spaceId, EVERY_DAY);
    await refusedThrough(createTestApp({ clock: () => sunday('18:00') }));
    await refusedThrough(createTestApp({ clock: () => sunday('07:59') }));

    // On a closed day.
    await prisma.spaceHours.updateMany({
      where: { spaceId, dayOfWeek: 0 },
      data: { isClosed: true, opensMinute: null, closesMinute: null },
    });
    await refusedThrough(app);

    expect(await storedOccupancy()).toBeNull();
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses an override under a closure in force or on an unverified space: 409 SPACE_NOT_OPEN, writing nothing', async () => {
    await setWeek(spaceId, EVERY_DAY);
    const refused = async (caller: { authorization: string }) => {
      const response = await setOverride(caller, { state: 'AVAILABLE', duration: 'HOUR_1' });
      expect(response.status).toBe(409);
      expect(errorOf(response).type).toBe('conflict');
      expect(errorOf(response).code).toBe('SPACE_NOT_OPEN');
    };

    // A closure in force, though the space is open by its hours.
    const closure = await prisma.announcement.create({
      data: { spaceId, type: 'CLOSURE', textAr: 'مغلق', startsAt: sunday('08:00') },
    });
    await refused(owner);
    await refused(reception);
    await prisma.announcement.delete({ where: { id: closure.id } });

    // No active owner: the space is unverified, and an override would count for nothing.
    await prisma.spaceManager.updateMany({
      where: { spaceId, role: 'OWNER' },
      data: { deactivatedAt: sunday('09:00') },
    });
    await refused(reception);

    expect(await storedOccupancy()).toBeNull();
    expect(await auditEntries()).toEqual([]);
  });

  it('clears the override in force, audited space.statusOverrideCleared; clearing none writes nothing', async () => {
    await setWeek(spaceId, EVERY_DAY);
    await prisma.spaceOccupancy.create({ data: { spaceId, capacity: 10 } });
    await setOverride(owner, { state: 'FULL', duration: 'HOUR_1' });
    await prisma.auditLog.deleteMany();

    const cleared = await clearOverride(reception);
    expect(cleared.status).toBe(200);
    expect(dataOf(cleared)).toMatchObject({ status: 'AVAILABLE', capacity: 10, override: null });
    expect(await storedOccupancy()).toEqual({
      capacity: 10,
      stateOverride: null,
      stateOverrideUntil: null,
      stateOverrideById: null,
    });
    expect(await auditEntries()).toEqual([
      {
        actorId: reception.id,
        action: 'space.statusOverrideCleared',
        entityType: 'space',
        entityId: spaceId,
        spaceId,
        before: { state: 'FULL', until: '2026-10-18T08:00:00.000Z' },
        after: null,
      },
    ]);

    // None in force: nothing written, an ended one left as it is.
    const none = await clearOverride(owner);
    expect(none.status).toBe(200);
    const ended = {
      capacity: 10,
      stateOverride: 'FULL' as const,
      stateOverrideUntil: sunday('09:00'),
      stateOverrideById: owner.id,
    };
    await prisma.spaceOccupancy.update({ where: { spaceId }, data: ended });
    const endedAlready = await clearOverride(owner);
    expect(endedAlready.status).toBe(200);
    expect(dataOf(endedAlready)).toMatchObject({ override: null });
    expect(await storedOccupancy()).toEqual(ended);
    expect(await auditEntries()).toHaveLength(1);
  });

  it('refuses a stranger, an owner of another space and the admin with not_found, on both routes', async () => {
    await setWeek(spaceId, EVERY_DAY);
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const set = await setOverride(caller, { state: 'FULL', duration: 'HOUR_1' });
      expect(set.status).toBe(404);
      expect(errorOf(set).type).toBe('not_found');

      const cleared = await clearOverride(caller);
      expect(cleared.status).toBe(404);
      expect(errorOf(cleared).type).toBe('not_found');
    }
    expect(await storedOccupancy()).toBeNull();
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses an invalid body with 422 before anything is written', async () => {
    await setWeek(spaceId, EVERY_DAY);
    const refusals = [
      [{ state: 'BUSY', duration: 'HOUR_1' }, { state: ['invalid_choice'] }],
      [{ state: 'FULL', duration: 'HOURS_3' }, { duration: ['invalid_choice'] }],
      [{}, { state: ['invalid_choice'], duration: ['invalid_choice'] }],
    ] as const;

    for (const [body, errors] of refusals) {
      const refused = await setOverride(owner, body);
      expect(refused.status).toBe(422);
      expect(errorOf(refused).type).toBe('validation');
      expect(errorOf(refused).errors).toEqual(errors);
    }
    expect(await storedOccupancy()).toBeNull();
    expect(await auditEntries()).toEqual([]);
  });

  it('the first override creates the occupancy row with no capacity; it never touches a capacity', async () => {
    await setWeek(spaceId, EVERY_DAY);
    await setOverride(owner, { state: 'FULL', duration: 'HOUR_1' });
    expect(await storedOccupancy()).toMatchObject({ capacity: null, stateOverride: 'FULL' });

    await prisma.spaceOccupancy.update({ where: { spaceId }, data: { capacity: 30 } });
    await setOverride(owner, { state: 'CLOSED', duration: 'HOUR_1' });
    expect(await storedOccupancy()).toMatchObject({ capacity: 30, stateOverride: 'CLOSED' });
  });

  it("a reception link deactivated while the override waits on the space's lock refuses it with 403", async () => {
    await setWeek(spaceId, EVERY_DAY);
    const response = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`,
      () => setOverride(reception, { state: 'FULL', duration: 'HOUR_1' }),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: reception.id } },
          data: { deactivatedAt: new Date() },
        }),
    );

    expect(response.status).toBe(403);
    expect(errorOf(response).type).toBe('forbidden');
    expect(await storedOccupancy()).toBeNull();
    expect(await auditEntries()).toEqual([]);
  });
});
