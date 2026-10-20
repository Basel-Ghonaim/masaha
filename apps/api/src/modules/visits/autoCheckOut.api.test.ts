import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf } from '../../../test/admin.ts';
import {
  createCheckIn,
  createCustomer,
  createSpace,
  createSubscription,
  createVisit,
} from '../../../test/factories.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { setWeek } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

const SECRET = 'a-jobs-secret-of-at-least-32-characters';

/** A time in Gaza on a day of the week of 2026-10-18 (Friday 16 to Sunday 18), UTC+3. */
const on = (day: string, time: string) => new Date(`2026-10-${day}T${time}+03:00`);
const sunday = (time: string) => on('18', time);

/** Runs the timed jobs through the endpoint, the API's clock at this time; answers their counts. */
async function runAt(at: Date) {
  const response = await request(createTestApp({ jobsSecret: SECRET, clock: () => at }))
    .post('/api/v1/internal/jobs/run')
    .set('Authorization', `Bearer ${SECRET}`);
  expect(response.status).toBe(200);
  return (dataOf(response) as { jobs: { name: string; done: Record<string, number> }[] }).jobs;
}

/** Open 08:00–18:00 every day. */
const EVERY_DAY = Array.from({ length: 7 }, () => [8 * 60, 18 * 60] as [number, number]);

let spaceId: number;

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
  await setWeek(spaceId, EVERY_DAY);
});

/** An open visit at 5 ₪ an hour and 25 ₪ a day, unless told. */
const openVisit = (
  checkedInAt: Date,
  rates: { hourRateAgorot: number | null; dayRateAgorot: number | null } = {
    hourRateAgorot: 500,
    dayRateAgorot: 2_500,
  },
) => createVisit(spaceId, { checkedInAt, ...rates });
const stored = (id: number) => prisma.visit.findUniqueOrThrow({ where: { id } });

describe('the auto check-out of visits', () => {
  it("a visit due at closing is closed at closing, not at the run's time, and charged to then", async () => {
    // 2 h 14 min to 18:00, up after 15 minutes: 2 hours. To 18:04 it would be 3.
    const { id } = await openVisit(sunday('15:46:00'));

    const jobs = await runAt(sunday('18:04:00'));
    expect(jobs[0]).toEqual({ name: 'visits.autoCheckOut', done: { visits: 1, remaining: 0 } });
    expect(await stored(id)).toMatchObject({
      checkedOutAt: sunday('18:00:00'),
      checkoutMethod: 'AUTO',
      chargeAgorot: 1_000,
      roundingRule: 'UP_AFTER_MINUTES',
      roundingMinutes: 15,
      capApplied: false,
      chargeSetById: null,
      chargeReason: null,
    });
  });

  it('a second run closes nothing more and audits nothing', async () => {
    await openVisit(sunday('15:46:00'));
    await runAt(sunday('18:04:00'));
    const audited = await auditEntries();

    const jobs = await runAt(sunday('18:09:00'));
    expect(jobs[0]?.done).toEqual({ visits: 0, remaining: 0 });
    expect(await auditEntries()).toEqual(audited);
  });

  it('a run after two days without runs closes each stay at its own due time', async () => {
    const friday = await openVisit(on('16', '10:00:00'));
    const saturday = await openVisit(on('17', '17:30:00'));
    const today = await openVisit(sunday('09:00:00'));

    const jobs = await runAt(sunday('10:20:00'));
    expect(jobs[0]?.done).toEqual({ visits: 2, remaining: 0 });
    expect(await stored(friday.id)).toMatchObject({
      checkedOutAt: on('16', '18:00:00'),
      chargeAgorot: 2_500, // 8 hours, capped at the day price
      capApplied: true,
    });
    expect(await stored(saturday.id)).toMatchObject({
      checkedOutAt: on('17', '18:00:00'),
      chargeAgorot: 500,
    });
    expect(await stored(today.id)).toMatchObject({ checkedOutAt: null });
  });

  it('a stay not yet due stays open', async () => {
    const { id } = await openVisit(sunday('10:00:00'));

    const jobs = await runAt(sunday('17:59:00'));
    expect(jobs[0]?.done).toEqual({ visits: 0, remaining: 0 });
    expect(await stored(id)).toMatchObject({ checkedOutAt: null, chargeAgorot: null });
  });

  it('the stay limit closes a stay before closing; turned on later, it closes an open stay at its new due time', async () => {
    await prisma.spaceSettings.update({ where: { spaceId }, data: { maxStayMinutes: 60 } });
    const limited = await openVisit(sunday('10:00:00'));
    await runAt(sunday('12:00:00'));
    expect(await stored(limited.id)).toMatchObject({
      checkedOutAt: sunday('11:00:00'),
      chargeAgorot: 500,
    });

    await prisma.spaceSettings.update({ where: { spaceId }, data: { maxStayMinutes: null } });
    const later = await openVisit(sunday('12:30:00'));
    await runAt(sunday('15:00:00'));
    expect(await stored(later.id)).toMatchObject({ checkedOutAt: null });

    // The limit set now applies from now on: the stay is closed at its new due time, in the past.
    await prisma.spaceSettings.update({ where: { spaceId }, data: { maxStayMinutes: 90 } });
    await runAt(sunday('15:05:00'));
    expect(await stored(later.id)).toMatchObject({
      checkedOutAt: sunday('14:00:00'),
      chargeAgorot: 1_000,
    });
  });

  it('a visit with no rate is closed with no charge, uncollected', async () => {
    const { id } = await openVisit(sunday('10:00:00'), {
      hourRateAgorot: null,
      dayRateAgorot: null,
    });

    await runAt(sunday('18:30:00'));
    expect(await stored(id)).toMatchObject({
      checkedOutAt: sunday('18:00:00'),
      checkoutMethod: 'AUTO',
      chargeAgorot: null,
      roundingRule: null,
      capApplied: null,
      customerId: null,
    });
  });

  it('open subscription check-ins are closed the same way, audited with no actor', async () => {
    const customer = await createCustomer(spaceId);
    const checkIn = await createCheckIn(await createSubscription(customer), {
      checkedInAt: sunday('09:00:00'),
    });

    const jobs = await runAt(sunday('18:30:00'));
    expect(jobs[1]).toEqual({
      name: 'subscriptions.autoCheckOut',
      done: { checkIns: 1, remaining: 0 },
    });
    expect(await prisma.checkIn.findUniqueOrThrow({ where: { id: checkIn.id } })).toMatchObject({
      checkedOutAt: sunday('18:00:00'),
      checkoutMethod: 'AUTO',
    });
    expect(await auditEntries()).toEqual([
      {
        actorId: null,
        action: 'checkIn.autoCheckedOut',
        entityType: 'checkIn',
        entityId: checkIn.id,
        spaceId,
        before: null,
        after: { checkedOutAt: '2026-10-18T15:00:00.000Z' },
      },
    ]);
  });

  it('a manual check-out meanwhile wins: the job finds the visit closed and leaves it', async () => {
    const { id } = await openVisit(sunday('15:46:00'));

    const response = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM visits WHERE id = ${id} FOR UPDATE`,
      () =>
        request(createTestApp({ jobsSecret: SECRET, clock: () => sunday('18:04:00') }))
          .post('/api/v1/internal/jobs/run')
          .set('Authorization', `Bearer ${SECRET}`),
      (tx) =>
        tx.visit.update({
          where: { id },
          data: { checkedOutAt: sunday('17:00:00'), checkoutMethod: 'MANUAL', chargeAgorot: 1_000 },
        }),
    );

    expect(response.status).toBe(200);
    expect((dataOf(response) as { jobs: { done: unknown }[] }).jobs[0]?.done).toEqual({
      visits: 0,
      remaining: 0,
    });
    expect(await stored(id)).toMatchObject({
      checkedOutAt: sunday('17:00:00'),
      checkoutMethod: 'MANUAL',
      chargeAgorot: 1_000,
    });
    expect(await auditEntries()).toEqual([]);
  });

  it('audits visit.autoCheckedOut with no actor', async () => {
    const { id } = await openVisit(sunday('15:46:00'));

    await runAt(sunday('18:04:00'));
    expect(await auditEntries()).toEqual([
      {
        actorId: null,
        action: 'visit.autoCheckedOut',
        entityType: 'visit',
        entityId: id,
        spaceId,
        before: null,
        after: { checkedOutAt: '2026-10-18T15:00:00.000Z', chargeAgorot: 1_000 },
      },
    ]);
  });
});
