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
  createVisit,
  stay,
} from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// Wednesday 2026-10-21 in Gaza.
const app = createTestApp({ clock: () => new Date('2026-10-21T10:00:00+03:00') });
const day = (date: string) => new Date(`${date}T00:00:00Z`);
const RECEIVED_AT = new Date('2026-10-20T12:00:00+03:00');

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

function file(caller: { authorization: string }, customerId: number) {
  return request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/customers/${String(customerId)}`)
    .set('Authorization', caller.authorization);
}

/** A payment on one item of the space, received on 2026-10-20. */
function pay(item: { visitId: number } | { subscriptionId: number }, amountAgorot: number) {
  return prisma.payment.create({
    data: {
      spaceId,
      ...item,
      idempotencyKey: randomUUID(),
      recordedById: owner.id,
      method: 'CASH',
      amountAgorot,
      receivedAt: RECEIVED_AT,
    },
  });
}

/** A visit of the space closed on this day, of this customer, with this charge (or none). */
function closedVisit(customerId: number, date: string, chargeAgorot: number | null) {
  return createVisit(spaceId, { ...stay(date, '09:00', '12:00'), customerId, chargeAgorot });
}

/**
 * Sara: a fixed monthly subscription of 30,000, paid 10,000, used on two days; a visit of 2,000 paid
 * 500 (and 1,500 voided); an unpriced visit; a visit paid in full; a written-off visit.
 */
async function seedSara() {
  const sara = await createCustomer(spaceId, { name: 'Sara', phone: '+970599000205' });
  const monthly = await createSubscription(sara, {
    name: 'Monthly',
    startsOn: day('2026-10-01'),
    endsOn: day('2026-10-31'),
  });
  await createCheckIn(monthly, stay('2026-10-16', '09:00', '10:30'));
  await createCheckIn(monthly, stay('2026-10-21', '08:00', '09:00'));
  await pay({ subscriptionId: monthly.id }, 10_000);
  const owing = await closedVisit(sara.id, '2026-10-18', 2_000);
  const kept = await pay({ visitId: owing.id }, 500);
  const voided = await pay({ visitId: owing.id }, 1_500);
  await prisma.payment.update({
    where: { id: voided.id },
    data: { voidedAt: RECEIVED_AT, voidedById: owner.id, voidReason: 'Counted twice' },
  });
  const unpriced = await closedVisit(sara.id, '2026-10-19', null);
  await pay({ visitId: (await closedVisit(sara.id, '2026-10-19', 1_000)).id }, 1_000);
  const writtenOff = await closedVisit(sara.id, '2026-10-20', 3_000);
  await prisma.visit.update({
    where: { id: writtenOff.id },
    data: { writtenOffAt: RECEIVED_AT, writtenOffById: owner.id, writeOffReason: 'Gone' },
  });
  return { sara, monthly, owing, kept, voided, unpriced };
}

describe("the customer's file", () => {
  it('answers the customer, the debt and credit, each subscription with status, progress, due, paid and balance, and the unpaid visits with their payments, voided ones marked', async () => {
    const { sara, monthly, owing, kept, voided, unpriced } = await seedSara();

    const response = await file(reception, sara.id);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toEqual({
      customer: { id: sara.id, name: 'Sara', phone: '+970599000205', archivedAt: null },
      debtAgorot: 20_000 + 1_500,
      creditAgorot: 0,
      present: null,
      subscriptions: [
        {
          id: monthly.id,
          customerId: sara.id,
          packageId: null,
          name: 'Monthly',
          startsOn: '2026-10-01',
          endsOn: '2026-10-31',
          totalDays: null,
          daysPerWeek: null,
          hoursPerDay: null,
          totalHours: null,
          billing: 'FIXED',
          priceAgorot: 30_000,
          audience: 'GENERAL',
          shiftId: null,
          ended: null,
          status: 'ACTIVE',
          progress: { daysUsed: 2, daysThisWeek: 1, minutesUsed: 150, minutesToday: 60 },
          dueAgorot: 30_000,
          paidAgorot: 10_000,
          balanceAgorot: 20_000,
        },
      ],
      unpaidVisits: [
        {
          visit: expect.objectContaining({
            id: owing.id,
            customer: { id: sara.id, name: 'Sara', phone: '+970599000205' },
            charge: expect.objectContaining({ amountAgorot: 2_000 }) as unknown,
            writeOff: null,
          }) as unknown,
          payments: [
            {
              id: kept.id,
              amountAgorot: 500,
              method: 'CASH',
              note: null,
              receivedAt: RECEIVED_AT.toISOString(),
              recordedById: owner.id,
              voided: null,
            },
            {
              id: voided.id,
              amountAgorot: 1_500,
              method: 'CASH',
              note: null,
              receivedAt: RECEIVED_AT.toISOString(),
              recordedById: owner.id,
              voided: { at: RECEIVED_AT.toISOString(), byId: owner.id, reason: 'Counted twice' },
            },
          ],
          paidAgorot: 500,
          balanceAgorot: 1_500,
        },
        {
          visit: expect.objectContaining({ id: unpriced.id, charge: null }) as unknown,
          payments: [],
          paidAgorot: 0,
          balanceAgorot: null,
        },
      ],
    });
  });

  it('who is present: an open check-in, or an open visit, or none', async () => {
    const subscriber = await createCustomer(spaceId, { name: 'Subscriber' });
    const subscription = await createSubscription(subscriber);
    const checkIn = await createCheckIn(subscription, {
      checkedInAt: new Date('2026-10-21T08:00:00+03:00'),
    });
    const visitor = await createCustomer(spaceId, { name: 'Visitor' });
    const visit = await createVisit(spaceId, {
      checkedInAt: new Date('2026-10-21T08:30:00+03:00'),
      customerId: visitor.id,
    });
    const absent = await createCustomer(spaceId, { name: 'Absent' });

    expect((dataOf(await file(owner, subscriber.id)) as { present: unknown }).present).toEqual({
      kind: 'CHECK_IN',
      id: checkIn.id,
      subscriptionId: subscription.id,
      since: '2026-10-21T05:00:00.000Z',
    });
    expect((dataOf(await file(owner, visitor.id)) as { present: unknown }).present).toEqual({
      kind: 'VISIT',
      id: visit.id,
      since: '2026-10-21T05:30:00.000Z',
    });
    expect((dataOf(await file(owner, absent.id)) as { present: unknown }).present).toBeNull();
  });

  it("another space's customer and an unknown one are not_found; so is any customer to a stranger, another space's owner and the admin", async () => {
    const sara = await createCustomer(spaceId);
    const theirs = await createCustomer(otherSpaceId);

    for (const response of [await file(owner, theirs.id), await file(owner, 999_999)]) {
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    for (const caller of [stranger, unrelatedOwner, admin]) {
      expect((await file(caller, sara.id)).status).toBe(404);
    }
  });

  it("the file's debt is the sum of its rows' positive balances, each its due less what was paid", async () => {
    const { sara } = await seedSara();
    // A per-day subscription in credit: its negative balance offsets nothing.
    const perDay = await createSubscription(sara, { billing: 'PER_DAY', priceAgorot: 2_500 });
    await createCheckIn(perDay, stay('2026-10-17', '09:00', '10:00'));
    await pay({ subscriptionId: perDay.id }, 4_000);

    const answer = dataOf(await file(owner, sara.id)) as {
      debtAgorot: number;
      creditAgorot: number;
      subscriptions: { dueAgorot: number; paidAgorot: number; balanceAgorot: number }[];
      unpaidVisits: {
        visit: { charge: { amountAgorot: number } | null };
        paidAgorot: number;
        balanceAgorot: number | null;
      }[];
    };
    for (const { dueAgorot, paidAgorot, balanceAgorot } of answer.subscriptions) {
      expect(balanceAgorot).toBe(dueAgorot - paidAgorot);
    }
    for (const { visit, paidAgorot, balanceAgorot } of answer.unpaidVisits) {
      expect(balanceAgorot).toBe(visit.charge ? visit.charge.amountAgorot - paidAgorot : null);
    }
    const positive = [...answer.subscriptions, ...answer.unpaidVisits]
      .map(({ balanceAgorot }) => balanceAgorot ?? 0)
      .filter((balance) => balance > 0);
    expect(answer.debtAgorot).toBe(positive.reduce((sum, balance) => sum + balance, 0));
    expect(answer.debtAgorot).toBe(21_500);
    expect(answer.creditAgorot).toBe(1_500);
  });
});
