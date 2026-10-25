import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, errorOf, signIn } from '../../../test/admin.ts';
import {
  createCheckIn,
  createCustomer,
  createSpace,
  createSubscription,
  stay,
} from '../../../test/factories.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// A subscription's statement (docs/api/api-contract.md › Subscriptions (managed)), on Wednesday
// 21 October 2026 at 10:00 in Gaza; the week began on Saturday the 17th.
const app = createTestApp({ clock: () => new Date('2026-10-21T10:00:00+03:00') });

let spaceId: number;
let otherSpaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };
let stranger: { id: number; authorization: string };
let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  stranger = await signIn('USER', 'stranger@example.com');
  admin = await signIn('ADMIN');
  ({ id: otherSpaceId } = await createSpace('other-space'));
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
});

function statement(caller: { authorization: string }, subscriptionId: number) {
  return request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/subscriptions/${String(subscriptionId)}`)
    .set('Authorization', caller.authorization);
}

/** A payment of the subscription recorded by the owner, outside the API. */
function paid(subscriptionId: number, amountAgorot: number, receivedAt: string) {
  return prisma.payment.create({
    data: {
      spaceId,
      subscriptionId,
      idempotencyKey: randomUUID(),
      recordedById: owner.id,
      method: 'CASH',
      amountAgorot,
      receivedAt: new Date(receivedAt),
    },
  });
}

describe("a subscription's statement", () => {
  it('answers the status, progress, due, paid, balance, its check-ins with their minutes and its payments, voided ones marked, whole', async () => {
    const sara = await createCustomer(spaceId, { name: 'Sara', phone: '+970599000205' });
    // Scenario 1: an exam student, three weeks by the hour at ₪5.
    const exams = await createSubscription(sara, {
      name: 'امتحانات',
      startsOn: new Date('2026-10-03'),
      endsOn: new Date('2026-10-23'),
      billing: 'PER_HOUR',
      priceAgorot: 500,
      audience: 'STUDENT',
    });
    const first = await createCheckIn(exams, stay('2026-10-03', '09:00', '13:00'));
    const second = await createCheckIn(exams, stay('2026-10-04', '10:00', '15:00'));
    const third = await createCheckIn(exams, stay('2026-10-06', '16:00', '19:00'));
    // Present now: its day is used, its minutes not yet.
    const open = await createCheckIn(exams, { checkedInAt: new Date('2026-10-21T09:00:00+03:00') });
    const kept = await paid(exams.id, 2_000, '2026-10-06T19:05:00+03:00');
    const wrong = await paid(exams.id, 1_000, '2026-10-07T10:00:00+03:00');
    await prisma.payment.update({
      where: { id: wrong.id },
      data: {
        voidedAt: new Date('2026-10-07T11:00:00+03:00'),
        voidedById: owner.id,
        voidReason: 'Twice',
      },
    });

    const response = await statement(reception, exams.id);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toEqual({
      id: exams.id,
      customerId: sara.id,
      packageId: null,
      renewalOfId: null,
      name: 'امتحانات',
      startsOn: '2026-10-03',
      endsOn: '2026-10-23',
      totalDays: null,
      daysPerWeek: null,
      hoursPerDay: null,
      totalHours: null,
      billing: 'PER_HOUR',
      priceAgorot: 500,
      audience: 'STUDENT',
      shiftId: null,
      priceTyped: null,
      ended: null,
      status: 'ENDING_SOON',
      progress: { daysUsed: 4, daysThisWeek: 1, minutesUsed: 720, minutesToday: 0 },
      // 720 minutes × ₪5 an hour.
      dueAgorot: 6_000,
      paidAgorot: 2_000,
      balanceAgorot: 4_000,
      customer: { id: sara.id, name: 'Sara', phone: '+970599000205' },
      checkIns: [
        {
          id: first.id,
          checkedInAt: '2026-10-03T06:00:00.000Z',
          checkedOutAt: '2026-10-03T10:00:00.000Z',
          checkoutMethod: 'MANUAL',
          minutes: 240,
        },
        {
          id: second.id,
          checkedInAt: '2026-10-04T07:00:00.000Z',
          checkedOutAt: '2026-10-04T12:00:00.000Z',
          checkoutMethod: 'MANUAL',
          minutes: 300,
        },
        {
          id: third.id,
          checkedInAt: '2026-10-06T13:00:00.000Z',
          checkedOutAt: '2026-10-06T16:00:00.000Z',
          checkoutMethod: 'MANUAL',
          minutes: 180,
        },
        {
          id: open.id,
          checkedInAt: '2026-10-21T06:00:00.000Z',
          checkedOutAt: null,
          checkoutMethod: null,
          minutes: null,
        },
      ],
      payments: [
        {
          id: kept.id,
          amountAgorot: 2_000,
          method: 'CASH',
          note: null,
          receivedAt: '2026-10-06T16:05:00.000Z',
          recordedById: owner.id,
          voided: null,
        },
        {
          id: wrong.id,
          amountAgorot: 1_000,
          method: 'CASH',
          note: null,
          receivedAt: '2026-10-07T07:00:00.000Z',
          recordedById: owner.id,
          voided: { at: '2026-10-07T08:00:00.000Z', byId: owner.id, reason: 'Twice' },
        },
      ],
      // Running: renewed, it would start the day after its end.
      renewal: { startsOn: '2026-10-24' },
      renewedById: null,
    });
  });

  it("each check-in's minutes are counted as the attendance is: their sum is progress.minutesUsed", async () => {
    const sara = await createCustomer(spaceId, { name: 'Sara' });
    const hours = await createSubscription(sara, { billing: 'PER_HOUR', priceAgorot: 500 });
    // Whole minutes each, the seconds dropped: 30 and 44.
    await createCheckIn(hours, {
      checkedInAt: new Date('2026-10-19T09:00:00.000+03:00'),
      checkedOutAt: new Date('2026-10-19T09:30:59.999+03:00'),
      checkoutMethod: 'MANUAL',
    });
    await createCheckIn(hours, {
      checkedInAt: new Date('2026-10-20T10:00:30.000+03:00'),
      checkedOutAt: new Date('2026-10-20T10:45:10.000+03:00'),
      checkoutMethod: 'MANUAL',
    });

    const { checkIns, progress } = dataOf(await statement(reception, hours.id)) as {
      checkIns: { minutes: number | null }[];
      progress: { minutesUsed: number };
    };
    expect(checkIns.map(({ minutes }) => minutes)).toEqual([30, 44]);
    expect(progress.minutesUsed).toBe(74);
  });

  it('reads one snapshot: a check-in and a payment committed while it waits leave its sums and its lists agreeing', async () => {
    const sara = await createCustomer(spaceId, { name: 'Sara' });
    const hours = await createSubscription(sara, { billing: 'PER_HOUR', priceAgorot: 500 });
    await createCheckIn(hours, stay('2026-10-19', '09:00', '11:00'));
    await paid(hours.id, 300, '2026-10-19T11:05:00+03:00');

    // The statement's money read (its items' balances) is the only one that reads the visits: the
    // test holds that table, so the statement waits there, past its other reads, while a check-in
    // and a payment of the subscription commit.
    const response = await whileHeld(
      (tx) => tx.$executeRaw`LOCK TABLE visits IN ACCESS EXCLUSIVE MODE`,
      () => statement(reception, hours.id),
      async (tx) => {
        await tx.checkIn.create({
          data: {
            spaceId,
            customerId: sara.id,
            subscriptionId: hours.id,
            idempotencyKey: randomUUID(),
            ...stay('2026-10-20', '09:00', '10:00'),
          },
        });
        await tx.payment.create({
          data: {
            spaceId,
            subscriptionId: hours.id,
            idempotencyKey: randomUUID(),
            recordedById: owner.id,
            method: 'CASH',
            amountAgorot: 200,
            receivedAt: new Date('2026-10-20T10:05:00+03:00'),
          },
        });
      },
    );
    expect(response.status).toBe(200);
    const answer = dataOf(response) as {
      progress: { minutesUsed: number };
      dueAgorot: number;
      paidAgorot: number;
      balanceAgorot: number;
      checkIns: { minutes: number | null }[];
      payments: { amountAgorot: number; voided: unknown }[];
    };
    const listedPaid = answer.payments
      .filter(({ voided }) => voided === null)
      .reduce((sum, { amountAgorot }) => sum + amountAgorot, 0);
    expect(answer.paidAgorot).toBe(listedPaid);
    expect(answer.progress.minutesUsed).toBe(
      answer.checkIns.reduce((sum, { minutes }) => sum + (minutes ?? 0), 0),
    );
    expect(answer.balanceAgorot).toBe(answer.dueAgorot - answer.paidAgorot);
  });

  it("a running subscription proposes its renewal's start; a renewed one answers renewedById and no proposal", async () => {
    const sara = await createCustomer(spaceId);
    const monthly = await createSubscription(sara, {
      startsOn: new Date('2026-10-01'),
      endsOn: new Date('2026-10-30'),
    });
    expect(dataOf(await statement(owner, monthly.id))).toMatchObject({
      renewal: { startsOn: '2026-10-31' },
      renewedById: null,
    });

    const renewal = await createSubscription(sara, {
      startsOn: new Date('2026-10-31'),
      endsOn: new Date('2026-11-29'),
      renewalOfId: monthly.id,
    });
    expect(dataOf(await statement(owner, monthly.id))).toMatchObject({
      renewal: null,
      renewedById: renewal.id,
    });
    expect(dataOf(await statement(owner, renewal.id))).toMatchObject({
      renewalOfId: monthly.id,
      renewal: { startsOn: '2026-11-30' },
    });
  });

  it("another space's subscription and an unknown one are not_found; so is any to a stranger and the admin", async () => {
    const theirs = await createSubscription(await createCustomer(otherSpaceId));
    for (const id of [theirs.id, 999_999]) {
      const response = await statement(owner, id);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    const ours = await createSubscription(await createCustomer(spaceId));
    for (const caller of [stranger, admin]) {
      expect((await statement(caller, ours.id)).status).toBe(404);
    }
  });
});
