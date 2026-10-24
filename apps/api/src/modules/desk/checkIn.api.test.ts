import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createCustomer, createSpace, createSubscription } from '../../../test/factories.ts';
import { waitingOnLock, whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { addPrice, setWeek, signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

/** A time on Sunday 2026-10-18 in Gaza, UTC+3 until 2026-10-24. */
const sunday = (time: string) => new Date(`2026-10-18T${time}:00+03:00`);
const app = createTestApp({ clock: () => sunday('10:00') });

/** Open 08:00–18:00 every day. */
const EVERY_DAY = Array.from({ length: 7 }, () => [8 * 60, 18 * 60] as [number, number]);

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
  await prisma.spaceSettings.create({
    data: {
      spaceId,
      autoCheckoutAtClosing: true,
      visitRounding: 'UP_AFTER_MINUTES',
      visitRoundingMinutes: 15,
      visitCapAtDayPrice: true,
    },
  });
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  stranger = await signIn('USER', 'stranger@example.com');
  ({ id: otherSpaceId } = await createSpace('other-space'));
  unrelatedOwner = await signInOwnerOf(otherSpaceId);
  admin = await signIn('ADMIN');
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
  await setWeek(spaceId, EVERY_DAY);
  await addPrice(spaceId, 'HOUR', 500);
  await addPrice(spaceId, 'DAY', 2_500);
  await addPrice(spaceId, 'HOUR', 400, 'STUDENT');
});

/** Checks a visitor in as the caller, with this key, through `app` unless another is given. */
function checkIn(
  caller: { authorization: string },
  body: object,
  key: string | null = randomUUID(),
  through = app,
) {
  const call = request(through)
    .post(`/api/v1/manage/spaces/${String(spaceId)}/visits`)
    .set('Authorization', caller.authorization);
  return (key === null ? call : call.set('Idempotency-Key', key)).send(body);
}

/** The visits stored, oldest first. */
function storedVisits() {
  return prisma.visit.findMany({ orderBy: { id: 'asc' } });
}

describe('checking a visitor in', () => {
  it("the owner and reception check a visitor in: 201, the rates of the visit's audience copied, audited visit.checkedIn", async () => {
    const general = await checkIn(owner, { visitorName: 'Omar' });
    expect(general.status).toBe(201);
    const { id: generalId } = dataOf(general) as { id: number };
    expect(dataOf(general)).toEqual({
      id: generalId,
      visitorName: 'Omar',
      customer: null,
      audience: 'GENERAL',
      shiftId: null,
      hourRateAgorot: 500,
      dayRateAgorot: 2_500,
      checkedInAt: '2026-10-18T07:00:00.000Z',
      checkedOutAt: null,
      checkoutMethod: null,
      charge: null,
      writeOff: null,
    });
    expect(general.body).not.toHaveProperty('meta');

    // Rates sent with the request are no rates of the visit's.
    const student = await checkIn(reception, {
      visitorName: 'Layla',
      audience: 'STUDENT',
      hourRateAgorot: 1,
    });
    expect(student.status).toBe(201);
    const { id: studentId } = dataOf(student) as { id: number };
    expect(dataOf(student)).toMatchObject({
      visitorName: 'Layla',
      audience: 'STUDENT',
      hourRateAgorot: 400,
      dayRateAgorot: 2_500,
    });

    expect(await auditEntries()).toEqual([
      {
        actorId: owner.id,
        action: 'visit.checkedIn',
        entityType: 'visit',
        entityId: generalId,
        spaceId,
        before: null,
        after: {
          visitorName: 'Omar',
          audience: 'GENERAL',
          shiftId: null,
          hourRateAgorot: 500,
          dayRateAgorot: 2_500,
        },
      },
      {
        actorId: reception.id,
        action: 'visit.checkedIn',
        entityType: 'visit',
        entityId: studentId,
        spaceId,
        before: null,
        after: {
          visitorName: 'Layla',
          audience: 'STUDENT',
          shiftId: null,
          hourRateAgorot: 400,
          dayRateAgorot: 2_500,
        },
      },
    ]);
  });

  it('refuses a stranger, an owner of another space and the admin with not_found', async () => {
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await checkIn(caller, { visitorName: 'Omar' });
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    expect(await storedVisits()).toEqual([]);
  });

  it('refuses a STUDENT visit where the space turns student prices off (422 invalid_choice on audience)', async () => {
    await prisma.spaceSettings.update({
      where: { spaceId },
      data: { visitStudentPrices: false },
    });

    const response = await checkIn(owner, { visitorName: 'Layla', audience: 'STUDENT' });
    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ audience: ['invalid_choice'] });
    expect(await storedVisits()).toEqual([]);
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses a shift of another space (422 invalid_choice on shiftId), writing nothing', async () => {
    const shift = { nameAr: 'مسائي', startsMinute: 14 * 60, endsMinute: 18 * 60 };
    const theirs = await prisma.spaceShift.create({ data: { spaceId: otherSpaceId, ...shift } });
    const ours = await prisma.spaceShift.create({ data: { spaceId, ...shift } });

    const response = await checkIn(owner, { visitorName: 'Omar', shiftId: theirs.id });
    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ shiftId: ['invalid_choice'] });
    expect(await storedVisits()).toEqual([]);
    expect(await auditEntries()).toEqual([]);

    // A shift of its own space is taken; without a price of its own, the visit has the others.
    const taken = await checkIn(owner, { visitorName: 'Omar', shiftId: ours.id });
    expect(taken.status).toBe(201);
    expect(dataOf(taken)).toMatchObject({
      shiftId: ours.id,
      hourRateAgorot: 500,
      dayRateAgorot: 2_500,
    });
  });

  it('a retry with the same key answers the same visit, 201, and writes one row', async () => {
    const key = randomUUID();
    const first = await checkIn(reception, { visitorName: 'Omar' }, key);
    const retry = await checkIn(reception, { visitorName: 'Omar' }, key);

    expect(first.status).toBe(201);
    expect(retry.status).toBe(201);
    expect(dataOf(retry)).toEqual(dataOf(first));
    expect(await storedVisits()).toHaveLength(1);
    expect((await auditEntries()).map(({ action }) => action)).toEqual(['visit.checkedIn']);
  });

  it('two requests with one key at once make one visit', async () => {
    const key = randomUUID();
    const pending: Promise<request.Response>[] = [];
    // Both wait on the space's lock, so the second reads what the first committed.
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;
      pending.push(
        Promise.resolve(checkIn(owner, { visitorName: 'Omar' }, key)),
        Promise.resolve(checkIn(reception, { visitorName: 'Omar' }, key)),
      );
      await waitingOnLock({ count: 2 });
    });

    const [first, second] = await Promise.all(pending);
    expect([first?.status, second?.status]).toEqual([201, 201]);
    expect(dataOf(second as request.Response)).toEqual(dataOf(first as request.Response));
    expect(await storedVisits()).toHaveLength(1);
  });

  it('a missing or malformed Idempotency-Key is refused with 422 before the body is read', async () => {
    const missing = await checkIn(owner, {}, null);
    expect(missing.status).toBe(422);
    expect(errorOf(missing).errors).toEqual({ idempotencyKey: ['required'] });

    const malformed = await checkIn(owner, {}, 'not-a-uuid');
    expect(malformed.status).toBe(422);
    expect(errorOf(malformed).errors).toEqual({ idempotencyKey: ['invalid_format'] });
    expect(await storedVisits()).toEqual([]);
  });

  it('warns SPACE_FULL at capacity and OUTSIDE_OPENING_HOURS outside the hours, and checks in anyway; no warnings, no meta', async () => {
    await prisma.spaceOccupancy.create({ data: { spaceId, capacity: 1 } });

    const first = await checkIn(owner, { visitorName: 'Omar' });
    expect(first.status).toBe(201);
    expect(first.body).not.toHaveProperty('meta');

    const full = await checkIn(owner, { visitorName: 'Layla' });
    expect(full.status).toBe(201);
    expect(full.body).toMatchObject({ meta: { warnings: ['SPACE_FULL'] } });

    const evening = createTestApp({ clock: () => sunday('19:00') });
    const late = await checkIn(owner, { visitorName: 'Rami' }, randomUUID(), evening);
    expect(late.status).toBe(201);
    expect(late.body).toMatchObject({
      meta: { warnings: ['SPACE_FULL', 'OUTSIDE_OPENING_HOURS'] },
    });

    expect(await storedVisits()).toHaveLength(3);
  });

  it('a check-in during a running closure succeeds 201 with CLOSURE_IN_FORCE after SPACE_FULL and OUTSIDE_OPENING_HOURS; an outage, an ended or a deleted closure warns nothing', async () => {
    const announce = (data: object) =>
      prisma.announcement.create({
        data: {
          spaceId,
          type: 'CLOSURE',
          textAr: 'مغلق',
          startsAt: sunday('08:00'),
          idempotencyKey: randomUUID(),
          ...data,
        },
      });
    await announce({ type: 'OUTAGE' });
    await announce({ endsAt: sunday('09:00') });
    await announce({ deletedAt: sunday('09:30') });
    await announce({ startsAt: sunday('11:00') });
    await announce({ spaceId: otherSpaceId });
    const quiet = await checkIn(reception, { visitorName: 'Omar' });
    expect(quiet.status).toBe(201);
    expect(quiet.body).not.toHaveProperty('meta');

    await announce({});
    const closed = await checkIn(reception, { visitorName: 'Layla' });
    expect(closed.status).toBe(201);
    expect(closed.body).toMatchObject({ meta: { warnings: ['CLOSURE_IN_FORCE'] } });

    // Full and outside the hours too: the closure's warning comes last.
    await prisma.spaceOccupancy.create({ data: { spaceId, capacity: 2 } });
    const evening = createTestApp({ clock: () => sunday('19:00') });
    const late = await checkIn(owner, { visitorName: 'Rami' }, randomUUID(), evening);
    expect(late.status).toBe(201);
    expect(late.body).toMatchObject({
      meta: { warnings: ['SPACE_FULL', 'OUTSIDE_OPENING_HOURS', 'CLOSURE_IN_FORCE'] },
    });
    expect(await storedVisits()).toHaveLength(3);

    // A subscriber's check-in reads the same warnings of the space, then its own.
    const subscription = await createSubscription(await createCustomer(spaceId));
    const subscriber = await request(app)
      .post(`/api/v1/manage/spaces/${String(spaceId)}/check-ins`)
      .set('Authorization', reception.authorization)
      .set('Idempotency-Key', randomUUID())
      .send({ subscriptionId: subscription.id });
    expect(subscriber.status).toBe(201);
    expect(subscriber.body).toMatchObject({
      meta: { warnings: ['SPACE_FULL', 'CLOSURE_IN_FORCE'] },
    });
  });

  it("a reception link deactivated while the check-in waits on the space's lock refuses it with 403", async () => {
    const response = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`,
      () => checkIn(reception, { visitorName: 'Omar' }),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: reception.id } },
          data: { deactivatedAt: new Date() },
        }),
    );

    expect(response.status).toBe(403);
    expect(errorOf(response).type).toBe('forbidden');
    expect(await storedVisits()).toEqual([]);
  });

  it("checkedInAt is the clock's", async () => {
    const early = createTestApp({ clock: () => sunday('08:17') });
    const response = await checkIn(owner, { visitorName: 'Omar' }, randomUUID(), early);

    expect(dataOf(response)).toMatchObject({ checkedInAt: '2026-10-18T05:17:00.000Z' });
    const [stored] = await storedVisits();
    expect(stored?.checkedInAt).toEqual(sunday('08:17'));
  });
});
