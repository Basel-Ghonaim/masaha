import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import {
  createCheckIn,
  createCustomer,
  createSpace,
  createSubscription,
} from '../../../test/factories.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { setWeek, signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// A subscriber's check-out at the desk (docs/api/api-contract.md › Front desk (managed)), on
// Wednesday 21 October 2026 in Gaza (UTC+3 until 2026-10-24).
const wednesday = (time: string) => new Date(`2026-10-21T${time}:00+03:00`);
const app = createTestApp({ clock: () => wednesday('10:00') });
/** Open 08:00–22:00 every day. */
const EVERY_DAY = Array.from({ length: 7 }, () => [8 * 60, 22 * 60] as [number, number]);

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
  ({ id: otherSpaceId } = await createSpace('other-space'));
  admin = await signIn('ADMIN');
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
  // Checked out at closing.
  await prisma.spaceSettings.create({
    data: {
      spaceId,
      autoCheckoutAtClosing: true,
      visitRounding: 'PER_MINUTE',
      visitCapAtDayPrice: false,
    },
  });
  await setWeek(spaceId, EVERY_DAY);
});

/** Checks the check-in out as the caller. */
function checkOut(caller: { authorization: string }, checkInId: number) {
  return request(app)
    .post(`/api/v1/manage/spaces/${String(spaceId)}/check-ins/${String(checkInId)}/check-out`)
    .set('Authorization', caller.authorization)
    .send();
}

/**
 * Sara's hours pack at the space (or another): ₪6 an hour, this October; her check-in since 08:00
 * unless told.
 */
async function openCheckIn(at = spaceId, checkedInAt = wednesday('08:00')) {
  const customer = await createCustomer(at, { name: 'Sara' });
  const subscription = await createSubscription(customer, {
    name: 'ساعات',
    startsOn: new Date('2026-10-01'),
    endsOn: new Date('2026-10-30'),
    billing: 'PER_HOUR',
    priceAgorot: 600,
  });
  const checkIn = await createCheckIn(subscription, { checkedInAt });
  return { customer, subscription, checkIn };
}

const lockSpace = (tx: Pick<typeof prisma, '$queryRaw'>) =>
  tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;

describe('checking a subscriber out', () => {
  it("before its due time, closes it now, MANUAL, audited checkIn.checkedOut, answered with the subscription's due, paid and balance", async () => {
    const { customer, subscription, checkIn } = await openCheckIn();
    await prisma.payment.create({
      data: {
        spaceId,
        subscriptionId: subscription.id,
        idempotencyKey: randomUUID(),
        amountAgorot: 500,
        method: 'CASH',
        recordedById: owner.id,
        receivedAt: wednesday('08:05'),
      },
    });

    const response = await checkOut(reception, checkIn.id);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      id: checkIn.id,
      customer: { id: customer.id, name: 'Sara', phone: null },
      checkedInAt: '2026-10-21T05:00:00.000Z',
      checkedOutAt: '2026-10-21T07:00:00.000Z',
      checkoutMethod: 'MANUAL',
      subscription: {
        id: subscription.id,
        status: 'ACTIVE',
        // The stay's two hours now counted: 120 minutes at ₪6 an hour.
        progress: { daysUsed: 1, daysThisWeek: 1, minutesUsed: 120, minutesToday: 120 },
        dueAgorot: 1_200,
      },
      paidAgorot: 500,
      balanceAgorot: 700,
    });
    const stored = await prisma.checkIn.findUniqueOrThrow({ where: { id: checkIn.id } });
    expect(stored).toMatchObject({ checkedOutAt: wednesday('10:00'), checkoutMethod: 'MANUAL' });
    expect(await auditEntries()).toEqual([
      {
        actorId: reception.id,
        action: 'checkIn.checkedOut',
        entityType: 'checkIn',
        entityId: checkIn.id,
        spaceId,
        before: null,
        after: {
          checkedOutAt: '2026-10-21T07:00:00.000Z',
          requestedAt: '2026-10-21T07:00:00.000Z',
        },
      },
    ]);
  });

  it("a stay checked out the next morning is closed at its due time, its check-in day's closing; the audit keeps the request's time", async () => {
    // Checked in on Tuesday at 20:00, due at its 22:00 closing: 120 minutes at ₪6 an hour, not the
    // 840 minutes up to now.
    const { checkIn } = await openCheckIn(spaceId, new Date('2026-10-20T20:00:00+03:00'));

    const response = await checkOut(owner, checkIn.id);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      checkedOutAt: '2026-10-20T19:00:00.000Z',
      checkoutMethod: 'MANUAL',
      subscription: { progress: { minutesUsed: 120 }, dueAgorot: 1_200 },
      paidAgorot: 0,
      balanceAgorot: 1_200,
    });
    const stored = await prisma.checkIn.findUniqueOrThrow({ where: { id: checkIn.id } });
    expect(stored.checkedOutAt).toEqual(new Date('2026-10-20T22:00:00+03:00'));
    const [checkedOut] = await auditEntries();
    expect(checkedOut?.after).toEqual({
      checkedOutAt: '2026-10-20T19:00:00.000Z',
      requestedAt: '2026-10-21T07:00:00.000Z',
    });
  });

  it('a stay past the stay limit is closed at its end, before the closing', async () => {
    await prisma.spaceSettings.update({ where: { spaceId }, data: { maxStayMinutes: 90 } });
    const { checkIn } = await openCheckIn(spaceId, new Date('2026-10-20T20:00:00+03:00'));

    const response = await checkOut(owner, checkIn.id);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      checkedOutAt: '2026-10-20T18:30:00.000Z',
      subscription: { progress: { minutesUsed: 90 }, dueAgorot: 900 },
      balanceAgorot: 900,
    });
  });

  it('a closed check-in is answered as it is, nothing written or audited', async () => {
    const { checkIn } = await openCheckIn();
    await prisma.checkIn.update({
      where: { id: checkIn.id },
      data: { checkedOutAt: wednesday('09:00'), checkoutMethod: 'AUTO' },
    });

    const response = await checkOut(owner, checkIn.id);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      id: checkIn.id,
      checkedOutAt: '2026-10-21T06:00:00.000Z',
      checkoutMethod: 'AUTO',
      paidAgorot: 0,
      balanceAgorot: 600,
    });
    expect(await auditEntries()).toEqual([]);
  });

  it("another space's or an unknown check-in is not_found, so is any to a stranger and the admin; a link ended while waiting is 403", async () => {
    const theirs = await openCheckIn(otherSpaceId);
    for (const id of [theirs.checkIn.id, 999_999]) {
      const response = await checkOut(owner, id);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    const { checkIn } = await openCheckIn();
    for (const caller of [stranger, admin]) {
      expect((await checkOut(caller, checkIn.id)).status).toBe(404);
    }

    const response = await whileHeld(
      lockSpace,
      () => checkOut(reception, checkIn.id),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: reception.id } },
          data: { deactivatedAt: new Date() },
        }),
    );
    expect(response.status).toBe(403);
    const stored = await prisma.checkIn.findUniqueOrThrow({ where: { id: checkIn.id } });
    expect(stored.checkedOutAt).toBeNull();
    expect(await auditEntries()).toEqual([]);
  });
});
