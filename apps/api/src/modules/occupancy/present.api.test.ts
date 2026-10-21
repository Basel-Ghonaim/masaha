import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, errorOf, signIn } from '../../../test/admin.ts';
import {
  createCheckIn,
  createCustomer,
  createSpace,
  createSubscription,
  createVisit,
  stay,
} from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { setWeek, signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// Gaza is UTC+3 until 2026-10-24: Sunday 2026-10-18 at 10:00 there is 07:00 UTC.
const SUNDAY_10 = new Date('2026-10-18T10:00:00+03:00');
const app = createTestApp({ clock: () => SUNDAY_10 });

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
});

/** The space's state now, as the caller, through `app` unless another is given. */
function occupancyNow(caller: { authorization: string }, through = app) {
  return request(through)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/occupancy`)
    .set('Authorization', caller.authorization);
}

/** A time on Sunday 2026-10-18 in Gaza (+03:00). */
const sunday = (time: string) => new Date(`2026-10-18T${time}:00+03:00`);

/** An open check-in at the space by a new customer of that name. */
async function checkIn(name: string, checkedInAt: Date, at = spaceId) {
  const customer = await createCustomer(at, { name });
  const subscription = await createSubscription(customer);
  return createCheckIn(subscription, { checkedInAt });
}

describe("a space's state now", () => {
  it('answers the owner and reception the status, the capacity, the count and the people present', async () => {
    await setWeek(spaceId, EVERY_DAY);
    await prisma.spaceOccupancy.create({ data: { spaceId, capacity: 5 } });
    const visit = await createVisit(spaceId, {
      visitorName: 'Omar',
      checkedInAt: sunday('08:30'),
    });
    const layla = await checkIn('Layla', sunday('09:00'));

    for (const caller of [owner, reception]) {
      const response = await occupancyNow(caller);
      expect(response.status).toBe(200);
      expect(dataOf(response)).toEqual({
        status: 'AVAILABLE',
        capacity: 5,
        present: 2,
        override: null,
        people: [
          {
            kind: 'VISIT',
            id: visit.id,
            name: 'Omar',
            since: '2026-10-18T05:30:00.000Z',
            chargeNowAgorot: null,
          },
          {
            kind: 'CHECK_IN',
            id: layla.id,
            customerId: layla.customerId,
            name: 'Layla',
            since: '2026-10-18T06:00:00.000Z',
          },
        ],
      });
    }
  });

  it('answers not_found to a stranger, an owner of another space and the admin', async () => {
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await occupancyNow(caller);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
  });

  it("counts open visits and open subscription check-ins, never closed ones or another space's", async () => {
    const openVisit = await createVisit(spaceId, { checkedInAt: sunday('08:00') });
    await createVisit(spaceId, stay('2026-10-18', '08:00', '09:00'));
    const openCheckIn = await checkIn('Layla', sunday('08:10'));
    const closed = await createSubscription(await createCustomer(spaceId, { name: 'Huda' }));
    await createCheckIn(closed, stay('2026-10-18', '08:00', '09:30'));
    await createVisit(otherSpaceId, { checkedInAt: sunday('08:00') });
    await checkIn('Yousef', sunday('08:00'), otherSpaceId);

    const response = await occupancyNow(owner);
    expect(response.status).toBe(200);
    const { present, people } = dataOf(response) as { present: number; people: { id: number }[] };
    expect(present).toBe(2);
    expect(people.map(({ id }) => id)).toEqual([openVisit.id, openCheckIn.id]);
  });

  it("lists the people present oldest first, a check-in by its customer's name", async () => {
    const latest = await createVisit(spaceId, {
      visitorName: 'Omar',
      checkedInAt: sunday('09:30'),
    });
    const earliest = await checkIn('Layla', sunday('08:00'));
    const sameTime = await createVisit(spaceId, {
      visitorName: 'Rami',
      checkedInAt: sunday('08:00'),
    });
    const customer = await createCustomer(spaceId, { name: 'Mona' });
    const customersVisit = await createVisit(spaceId, {
      visitorName: null,
      customerId: customer.id,
      checkedInAt: sunday('08:45'),
    });

    const response = await occupancyNow(reception);
    expect(response.status).toBe(200);
    const { people } = dataOf(response) as { people: { kind: string; id: number; name: string }[] };
    expect(people.map(({ kind, id, name }) => ({ kind, id, name }))).toEqual([
      { kind: 'VISIT', id: sameTime.id, name: 'Rami' },
      { kind: 'CHECK_IN', id: earliest.id, name: 'Layla' },
      { kind: 'VISIT', id: customersVisit.id, name: 'Mona' },
      { kind: 'VISIT', id: latest.id, name: 'Omar' },
    ]);
  });

  it('reads the status from the hours, the capacity and the override', async () => {
    await setWeek(spaceId, EVERY_DAY);
    await prisma.spaceOccupancy.create({ data: { spaceId, capacity: 2 } });
    await createVisit(spaceId, { checkedInAt: sunday('08:00') });
    await checkIn('Layla', sunday('08:30'));

    // Two present of two: FULL.
    expect(dataOf(await occupancyNow(owner))).toMatchObject({ status: 'FULL', present: 2 });

    // At 19:00 the space is closed by its hours.
    const evening = createTestApp({ clock: () => sunday('19:00') });
    expect(dataOf(await occupancyNow(owner, evening))).toMatchObject({ status: 'CLOSED' });

    // An override in force gives its state, and is answered with its end.
    await prisma.spaceOccupancy.update({
      where: { spaceId },
      data: {
        stateOverride: 'AVAILABLE',
        stateOverrideUntil: sunday('10:30'),
        stateOverrideById: owner.id,
      },
    });
    expect(dataOf(await occupancyNow(owner))).toMatchObject({
      status: 'AVAILABLE',
      override: { state: 'AVAILABLE', until: '2026-10-18T07:30:00.000Z' },
    });
    // Once it has ended, it is answered as none and counts for nothing.
    const later = createTestApp({ clock: () => sunday('11:00') });
    expect(dataOf(await occupancyNow(owner, later))).toMatchObject({
      status: 'FULL',
      override: null,
    });

    // Without a capacity, no live state.
    await prisma.spaceOccupancy.update({
      where: { spaceId },
      data: {
        capacity: null,
        stateOverride: null,
        stateOverrideUntil: null,
        stateOverrideById: null,
      },
    });
    expect(dataOf(await occupancyNow(owner))).toMatchObject({
      status: null,
      capacity: null,
      present: 2,
    });
  });

  it('answers the override only while the rule uses it: a closure announced after it, or no active owner, hides it', async () => {
    await setWeek(spaceId, EVERY_DAY);
    await prisma.spaceOccupancy.create({
      data: {
        spaceId,
        capacity: 5,
        stateOverride: 'FULL',
        stateOverrideUntil: sunday('11:00'),
        stateOverrideById: owner.id,
      },
    });
    expect(dataOf(await occupancyNow(owner))).toMatchObject({
      status: 'FULL',
      override: { state: 'FULL', until: '2026-10-18T08:00:00.000Z' },
    });

    const closure = await prisma.announcement.create({
      data: { spaceId, type: 'CLOSURE', textAr: 'مغلق', startsAt: sunday('09:30') },
    });
    expect(dataOf(await occupancyNow(owner))).toMatchObject({ status: 'CLOSED', override: null });

    await prisma.announcement.delete({ where: { id: closure.id } });
    await prisma.spaceManager.updateMany({
      where: { spaceId, role: 'OWNER' },
      data: { deactivatedAt: sunday('09:00') },
    });
    expect(dataOf(await occupancyNow(reception))).toMatchObject({ status: null, override: null });
  });

  it('each visit present carries its charge so far, or none without a rate', async () => {
    // Checked in at 08:00 and read at 10:00: two hours at 5 ₪, up after 15 minutes.
    const rated = await createVisit(spaceId, {
      checkedInAt: sunday('08:00'),
      hourRateAgorot: 500,
      dayRateAgorot: 2_500,
    });
    const unrated = await createVisit(spaceId, { checkedInAt: sunday('08:10') });
    await checkIn('Layla', sunday('08:20'));

    const { people } = dataOf(await occupancyNow(reception)) as {
      people: { kind: string; id: number; chargeNowAgorot?: unknown }[];
    };
    expect(people.map(({ kind, id, chargeNowAgorot }) => ({ kind, id, chargeNowAgorot }))).toEqual([
      { kind: 'VISIT', id: rated.id, chargeNowAgorot: 1_000 },
      { kind: 'VISIT', id: unrated.id, chargeNowAgorot: null },
      { kind: 'CHECK_IN', id: expect.any(Number) as number, chargeNowAgorot: undefined },
    ]);
  });

  it("a visit present past its day's end is charged so far only up to 23:59 of its check-in's day", async () => {
    // Checked in on Saturday at 21:00, after closing, so due at 23:59: 2 h 59 min, up after 15
    // minutes, is 3 hours at 5 ₪ (up to now, 13 hours, it would be capped at the day price).
    const overdue = await createVisit(spaceId, {
      checkedInAt: new Date('2026-10-17T21:00:00+03:00'),
      hourRateAgorot: 500,
      dayRateAgorot: 2_500,
    });

    const { people } = dataOf(await occupancyNow(reception)) as {
      people: { id: number; chargeNowAgorot?: unknown }[];
    };
    expect(people.map(({ id, chargeNowAgorot }) => ({ id, chargeNowAgorot }))).toEqual([
      { id: overdue.id, chargeNowAgorot: 1_500 },
    ]);
  });

  it('a CLOSURE announcement in force closes it; a deleted, ended or other-type one does not', async () => {
    await setWeek(spaceId, EVERY_DAY);
    await prisma.spaceOccupancy.create({ data: { spaceId, capacity: 5 } });
    const announcement = (data: object) =>
      prisma.announcement.create({
        data: { spaceId, type: 'CLOSURE', textAr: 'مغلق', startsAt: sunday('08:00'), ...data },
      });
    await announcement({ deletedAt: sunday('09:00') });
    await announcement({ endsAt: sunday('09:00') });
    await announcement({ type: 'OUTAGE' });
    await announcement({ startsAt: sunday('11:00') });
    await prisma.announcement.create({
      data: { spaceId: otherSpaceId, type: 'CLOSURE', textAr: 'مغلق', startsAt: sunday('08:00') },
    });
    expect(dataOf(await occupancyNow(owner))).toMatchObject({ status: 'AVAILABLE' });

    await announcement({ endsAt: sunday('12:00') });
    expect(dataOf(await occupancyNow(owner))).toMatchObject({ status: 'CLOSED' });
  });
});
