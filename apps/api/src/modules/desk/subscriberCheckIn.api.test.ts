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
  createVisit,
  stay,
} from '../../../test/factories.ts';
import { waitingOnLock, whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { setWeek, signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// A subscriber's check-in at the desk (docs/api/api-contract.md › Front desk (managed)), on
// Wednesday 21 October 2026 in Gaza (UTC+3 until 2026-10-24); its week began on Saturday the 17th.
const wednesday = (time: string) => new Date(`2026-10-21T${time}:00+03:00`);
const app = createTestApp({ clock: () => wednesday('10:00') });

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
      visitRounding: 'PER_MINUTE',
      visitCapAtDayPrice: false,
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
});

/** Checks a subscriber in as the caller, with this key (a new one unless told; `null` for none). */
function checkIn(
  caller: { authorization: string },
  body: object,
  key: string | null = randomUUID(),
  through = app,
) {
  const call = request(through)
    .post(`/api/v1/manage/spaces/${String(spaceId)}/check-ins`)
    .set('Authorization', caller.authorization);
  return (key === null ? call : call.set('Idempotency-Key', key)).send(body);
}

/** A customer of the space by that name, with a month's subscription running this October. */
async function subscriber(name: string, terms: Record<string, unknown> = {}, at = spaceId) {
  const customer = await createCustomer(at, { name });
  const subscription = await createSubscription(customer, {
    startsOn: new Date('2026-10-01'),
    endsOn: new Date('2026-10-30'),
    ...terms,
  });
  return { customer, subscription };
}

const storedCheckIns = () => prisma.checkIn.findMany({ orderBy: { id: 'asc' } });
const lockSpace = (tx: Pick<typeof prisma, '$queryRaw'>) =>
  tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;
const warningsOf = (response: request.Response) =>
  (response.body as { meta?: { warnings?: string[] } }).meta?.warnings;

describe('checking a subscriber in', () => {
  it("the owner and reception check a subscriber in: 201, the subscription's state as of now, audited checkIn.checkedIn", async () => {
    const sara = await subscriber('Sara');
    await prisma.customer.update({
      where: { id: sara.customer.id },
      data: { phone: '+970599000205' },
    });
    const omar = await subscriber('Omar');

    const response = await checkIn(reception, { subscriptionId: sara.subscription.id });
    expect(response.status).toBe(201);
    const [stored] = await storedCheckIns();
    expect(dataOf(response)).toEqual({
      id: stored?.id,
      customer: { id: sara.customer.id, name: 'Sara', phone: '+970599000205' },
      subscription: {
        id: sara.subscription.id,
        customerId: sara.customer.id,
        packageId: null,
        renewalOfId: null,
        name: 'شهري',
        startsOn: '2026-10-01',
        endsOn: '2026-10-30',
        totalDays: null,
        daysPerWeek: null,
        hoursPerDay: null,
        totalHours: null,
        billing: 'FIXED',
        priceAgorot: 30_000,
        audience: 'GENERAL',
        shiftId: null,
        priceTyped: null,
        ended: null,
        status: 'ACTIVE',
        // Today is used by the open check-in; its minutes are not counted while it is open.
        progress: { daysUsed: 1, daysThisWeek: 1, minutesUsed: 0, minutesToday: 0 },
        dueAgorot: 30_000,
      },
      checkedInAt: '2026-10-21T07:00:00.000Z',
      checkedOutAt: null,
      checkoutMethod: null,
    });
    expect(response.body).not.toHaveProperty('meta');

    const byOwner = await checkIn(owner, { subscriptionId: omar.subscription.id });
    expect(byOwner.status).toBe(201);
    const { id: omarsId } = dataOf(byOwner) as { id: number };

    expect(await auditEntries()).toEqual([
      {
        actorId: reception.id,
        action: 'checkIn.checkedIn',
        entityType: 'checkIn',
        entityId: stored?.id,
        spaceId,
        before: null,
        after: { subscriptionId: sara.subscription.id, customerId: sara.customer.id },
      },
      {
        actorId: owner.id,
        action: 'checkIn.checkedIn',
        entityType: 'checkIn',
        entityId: omarsId,
        spaceId,
        before: null,
        after: { subscriptionId: omar.subscription.id, customerId: omar.customer.id },
      },
    ]);
    expect(await storedCheckIns()).toMatchObject([
      { customerId: sara.customer.id, method: 'MANUAL', checkedOutAt: null },
      { customerId: omar.customer.id, method: 'MANUAL', checkedOutAt: null },
    ]);
  });

  it('warns, never refuses: not started, expired, days used this week, hours used today, the space full, outside its hours', async () => {
    const upcoming = await subscriber('Huda', { startsOn: new Date('2026-10-25') });
    const expired = await subscriber('Layla', { endsOn: new Date('2026-10-20') });
    // Two days a week, both used on Sunday and Monday; none today yet.
    const twoDays = await subscriber('Rami', { daysPerWeek: 2 });
    await createCheckIn(twoDays.subscription, stay('2026-10-18', '09:00', '12:00'));
    await createCheckIn(twoDays.subscription, stay('2026-10-19', '09:00', '12:00'));
    // Two hours a day, two and a half used this morning.
    const twoHours = await subscriber('Mona', { hoursPerDay: 2 });
    await createCheckIn(twoHours.subscription, stay('2026-10-21', '07:00', '09:30'));

    const notStarted = await checkIn(reception, { subscriptionId: upcoming.subscription.id });
    expect([notStarted.status, warningsOf(notStarted)]).toEqual([
      201,
      ['SUBSCRIPTION_NOT_STARTED'],
    ]);
    const ended = await checkIn(reception, { subscriptionId: expired.subscription.id });
    expect([ended.status, warningsOf(ended)]).toEqual([201, ['SUBSCRIPTION_EXPIRED']]);
    const days = await checkIn(reception, { subscriptionId: twoDays.subscription.id });
    expect([days.status, warningsOf(days)]).toEqual([201, ['DAYS_PER_WEEK_USED']]);
    const hours = await checkIn(reception, { subscriptionId: twoHours.subscription.id });
    expect([hours.status, warningsOf(hours)]).toEqual([201, ['HOURS_PER_DAY_USED']]);

    // Four present, four seats; at 19:00 the space is closed by its hours.
    await prisma.spaceOccupancy.create({ data: { spaceId, capacity: 4 } });
    const late = await subscriber('Yousef');
    const evening = createTestApp({ clock: () => wednesday('19:00') });
    const full = await checkIn(
      reception,
      { subscriptionId: late.subscription.id },
      randomUUID(),
      evening,
    );
    expect([full.status, warningsOf(full)]).toEqual([201, ['SPACE_FULL', 'OUTSIDE_OPENING_HOURS']]);

    expect(await storedCheckIns()).toHaveLength(3 + 5);
  });

  it('a retry answers the same check-in and the same warnings, 201; two at once make one', async () => {
    const twoDays = await subscriber('Rami', { daysPerWeek: 2 });
    await createCheckIn(twoDays.subscription, stay('2026-10-18', '09:00', '12:00'));
    await createCheckIn(twoDays.subscription, stay('2026-10-19', '09:00', '12:00'));
    const key = randomUUID();

    const first = await checkIn(reception, { subscriptionId: twoDays.subscription.id }, key);
    const retry = await checkIn(reception, { subscriptionId: twoDays.subscription.id }, key);
    expect([first.status, retry.status]).toEqual([201, 201]);
    expect(dataOf(retry)).toEqual(dataOf(first));
    expect(warningsOf(retry)).toEqual(['DAYS_PER_WEEK_USED']);
    expect(warningsOf(first)).toEqual(['DAYS_PER_WEEK_USED']);
    expect(await storedCheckIns()).toHaveLength(3);
    expect((await auditEntries()).map(({ action }) => action)).toEqual(['checkIn.checkedIn']);

    // The key names another subscription: a conflict, nothing written.
    const other = await subscriber('Omar');
    const reused = await checkIn(reception, { subscriptionId: other.subscription.id }, key);
    expect(reused.status).toBe(409);
    expect(errorOf(reused).code).toBeUndefined();

    const together = randomUUID();
    const pending: Promise<request.Response>[] = [];
    // Both wait on the space's lock, so the second reads what the first committed.
    await prisma.$transaction(async (tx) => {
      await lockSpace(tx);
      pending.push(
        Promise.resolve(checkIn(owner, { subscriptionId: other.subscription.id }, together)),
        Promise.resolve(checkIn(reception, { subscriptionId: other.subscription.id }, together)),
      );
      await waitingOnLock({ count: 2 });
    });
    const [one, two] = await Promise.all(pending);
    expect([one?.status, two?.status]).toEqual([201, 201]);
    expect(dataOf(two as request.Response)).toEqual(dataOf(one as request.Response));
    expect(await storedCheckIns()).toHaveLength(4);
  });

  it('a customer present by a check-in or a visit is refused MEMBER_ALREADY_CHECKED_IN, writing nothing', async () => {
    const sara = await subscriber('Sara');
    const second = await createSubscription(sara.customer, { name: 'مسائي' });
    await createCheckIn(sara.subscription, { checkedInAt: wednesday('08:00') });
    const omar = await subscriber('Omar');
    await createVisit(spaceId, {
      visitorName: null,
      customerId: omar.customer.id,
      checkedInAt: wednesday('09:00'),
    });

    for (const subscriptionId of [second.id, omar.subscription.id]) {
      const response = await checkIn(reception, { subscriptionId });
      expect(response.status).toBe(409);
      expect(errorOf(response).code).toBe('MEMBER_ALREADY_CHECKED_IN');
    }
    expect(await storedCheckIns()).toHaveLength(1);
    expect(await auditEntries()).toEqual([]);
  });

  it("another space's or an unknown subscription is invalid_choice on subscriptionId; an archived customer CUSTOMER_ARCHIVED", async () => {
    const theirs = await subscriber('Huda', {}, otherSpaceId);
    for (const subscriptionId of [theirs.subscription.id, 999_999]) {
      const response = await checkIn(owner, { subscriptionId });
      expect(response.status).toBe(422);
      expect(errorOf(response).errors).toEqual({ subscriptionId: ['invalid_choice'] });
    }

    const archived = await subscriber('Layla');
    await prisma.customer.update({
      where: { id: archived.customer.id },
      data: { archivedAt: wednesday('09:00') },
    });
    const response = await checkIn(owner, { subscriptionId: archived.subscription.id });
    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('CUSTOMER_ARCHIVED');
    expect(await storedCheckIns()).toEqual([]);
    expect(await auditEntries()).toEqual([]);
  });

  it("a stranger, another space's owner and the admin are not_found; a reception link ended while waiting is 403", async () => {
    const sara = await subscriber('Sara');
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await checkIn(caller, { subscriptionId: sara.subscription.id });
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }

    const response = await whileHeld(
      lockSpace,
      () => checkIn(reception, { subscriptionId: sara.subscription.id }),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: reception.id } },
          data: { deactivatedAt: new Date() },
        }),
    );
    expect(response.status).toBe(403);
    expect(errorOf(response).type).toBe('forbidden');
    expect(await storedCheckIns()).toEqual([]);
  });

  it('a check-in waiting while the subscription is ended warns SUBSCRIPTION_EXPIRED', async () => {
    const sara = await subscriber('Sara');
    const response = await whileHeld(
      lockSpace,
      () => checkIn(reception, { subscriptionId: sara.subscription.id }),
      (tx) =>
        tx.subscription.update({
          where: { id: sara.subscription.id },
          data: {
            endsOn: new Date('2026-10-21'),
            endedAt: wednesday('09:59'),
            endedById: owner.id,
          },
        }),
    );
    expect(response.status).toBe(201);
    expect(warningsOf(response)).toEqual(['SUBSCRIPTION_EXPIRED']);
    expect(dataOf(response)).toMatchObject({ subscription: { status: 'EXPIRED' } });
  });

  it('a check-in waiting while the customer is archived is refused CUSTOMER_ARCHIVED', async () => {
    const sara = await subscriber('Sara');
    const response = await whileHeld(
      lockSpace,
      () => checkIn(reception, { subscriptionId: sara.subscription.id }),
      (tx) =>
        tx.customer.update({
          where: { id: sara.customer.id },
          data: { archivedAt: wednesday('09:59') },
        }),
    );
    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('CUSTOMER_ARCHIVED');
    expect(await storedCheckIns()).toEqual([]);
  });

  it('refuses a missing or malformed key and an invalid body with 422 before anything is read', async () => {
    const missing = await checkIn(owner, { subscriptionId: 999_999 }, null);
    expect(missing.status).toBe(422);
    expect(errorOf(missing).errors).toEqual({ idempotencyKey: ['required'] });

    const malformed = await checkIn(owner, { subscriptionId: 999_999 }, 'not-a-uuid');
    expect(malformed.status).toBe(422);
    expect(errorOf(malformed).errors).toEqual({ idempotencyKey: ['invalid_format'] });

    const invalid = await checkIn(owner, { subscriptionId: 'one' });
    expect(invalid.status).toBe(422);
    expect(errorOf(invalid).errors).toEqual({ subscriptionId: ['invalid_format'] });
    expect(await storedCheckIns()).toEqual([]);
  });
});
