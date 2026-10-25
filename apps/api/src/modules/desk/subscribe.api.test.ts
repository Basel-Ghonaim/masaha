import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createCustomer, createSpace } from '../../../test/factories.ts';
import { waitingOnLock, whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { addPrice, signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// Subscribing a customer at the desk (docs/api/api-contract.md › Subscriptions (managed)), on
// Wednesday 21 October 2026 in Gaza.
const app = createTestApp({ clock: () => new Date('2026-10-21T10:00:00+03:00') });

let spaceId: number;
let otherSpaceId: number;
let customerId: number;
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
  ({ id: customerId } = await createCustomer(spaceId, { name: 'Sara' }));
});

/** A package of the space (another one's when told): a month, five days a week, ₪300. */
function monthly(more: { space?: number; isActive?: boolean } = {}) {
  const { space = spaceId, isActive = true } = more;
  return prisma.package.create({
    data: {
      spaceId: space,
      name: 'شهري',
      validityDays: 30,
      daysPerWeek: 5,
      billing: 'FIXED',
      priceAgorot: 30_000,
      isActive,
    },
  });
}

/** Subscribes the customer as the caller, with this key (a new one unless told; `null` for none). */
function subscribe(
  caller: { authorization: string },
  body: object,
  { key = randomUUID(), customer = customerId }: { key?: string | null; customer?: number } = {},
) {
  const call = request(app)
    .post(`/api/v1/manage/spaces/${String(spaceId)}/customers/${String(customer)}/subscriptions`)
    .set('Authorization', caller.authorization);
  return (key === null ? call : call.set('Idempotency-Key', key)).send(body);
}

/** An exam student's terms, typed at the desk: by the hour, with a reason. */
const examTerms = (more: object = {}) => ({
  custom: {
    name: 'امتحانات',
    endsOn: '2026-11-10',
    billing: 'PER_HOUR',
    priceAgorot: 500,
    audience: 'STUDENT',
    reason: ' exam rate ',
    ...more,
  },
});

const storedSubscriptions = () => prisma.subscription.findMany({ orderBy: { id: 'asc' } });
const lockSpace = (tx: Pick<typeof prisma, '$queryRaw'>) =>
  tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;

const NO_PROGRESS = { daysUsed: 0, daysThisWeek: 0, minutesUsed: 0, minutesToday: 0 };

describe('subscribing a customer', () => {
  it('a subscription from a package copies its terms, ending validityDays after its start, audited subscription.created', async () => {
    const pack = await monthly();

    const response = await subscribe(reception, { packageId: pack.id });
    expect(response.status).toBe(201);
    const [stored] = await storedSubscriptions();
    expect(dataOf(response)).toEqual({
      subscription: {
        id: stored?.id,
        customerId,
        packageId: pack.id,
        renewalOfId: null,
        name: 'شهري',
        startsOn: '2026-10-21',
        // 30 days, both ends included.
        endsOn: '2026-11-19',
        totalDays: null,
        daysPerWeek: 5,
        hoursPerDay: null,
        totalHours: null,
        billing: 'FIXED',
        priceAgorot: 30_000,
        audience: 'GENERAL',
        shiftId: null,
        priceTyped: null,
        ended: null,
        status: 'ACTIVE',
        progress: NO_PROGRESS,
        dueAgorot: 30_000,
        paidAgorot: 0,
        balanceAgorot: 30_000,
      },
      payments: [],
      debtAgorot: 30_000,
    });
    expect((response.body as { meta?: object }).meta).toBeUndefined();
    expect(await auditEntries()).toEqual([
      {
        actorId: reception.id,
        action: 'subscription.created',
        entityType: 'subscription',
        entityId: stored?.id,
        spaceId,
        before: null,
        after: {
          customerId,
          packageId: pack.id,
          renewalOfId: null,
          name: 'شهري',
          startsOn: '2026-10-21',
          endsOn: '2026-11-19',
          totalDays: null,
          daysPerWeek: 5,
          hoursPerDay: null,
          totalHours: null,
          billing: 'FIXED',
          priceAgorot: 30_000,
          audience: 'GENERAL',
          shiftId: null,
          reason: null,
        },
      },
    ]);
  });

  it("a retired package, or another space's, is invalid_choice on packageId, writing nothing", async () => {
    const retired = await monthly({ isActive: false });
    const others = await monthly({ space: otherSpaceId });

    for (const packageId of [retired.id, others.id, 999_999]) {
      const response = await subscribe(owner, { packageId });
      expect(response.status).toBe(422);
      expect(errorOf(response).errors).toEqual({ packageId: ['invalid_choice'] });
    }
    expect(await storedSubscriptions()).toEqual([]);
    expect(await auditEntries()).toEqual([]);
  });

  it('a published week or month price is copied as fixed terms with no limits, 7 or 30 days, even by reception', async () => {
    await addPrice(spaceId, 'MONTH', 25_000);
    await addPrice(spaceId, 'WEEK', 8_000);
    await addPrice(spaceId, 'MONTH', 20_000, 'STUDENT');

    const month = await subscribe(reception, {
      published: { period: 'MONTH', audience: 'GENERAL', name: 'شهري' },
    });
    expect(month.status).toBe(201);
    expect((dataOf(month) as { subscription: object }).subscription).toMatchObject({
      packageId: null,
      name: 'شهري',
      startsOn: '2026-10-21',
      // 30 days, both ends included.
      endsOn: '2026-11-19',
      totalDays: null,
      daysPerWeek: null,
      hoursPerDay: null,
      totalHours: null,
      billing: 'FIXED',
      priceAgorot: 25_000,
      audience: 'GENERAL',
      shiftId: null,
      priceTyped: null,
    });

    const week = await subscribe(reception, {
      published: { period: 'WEEK', audience: 'GENERAL', name: 'أسبوعي' },
      startsOn: '2026-11-20',
    });
    expect((dataOf(week) as { subscription: object }).subscription).toMatchObject({
      startsOn: '2026-11-20',
      // 7 days, both ends included.
      endsOn: '2026-11-26',
      priceAgorot: 8_000,
    });

    const student = await subscribe(owner, {
      published: { period: 'MONTH', audience: 'STUDENT', name: 'Monthly' },
      startsOn: '2026-11-27',
    });
    expect((dataOf(student) as { subscription: object }).subscription).toMatchObject({
      name: 'Monthly',
      priceAgorot: 20_000,
      audience: 'STUDENT',
    });
  });

  it('a later prices save leaves a subscription made from a published price as it was', async () => {
    await addPrice(spaceId, 'MONTH', 25_000);
    const made = await subscribe(reception, {
      published: { period: 'MONTH', audience: 'GENERAL', name: 'شهري' },
    });
    expect(made.status).toBe(201);

    // A save writes the prices anew (prices.repository.ts).
    await prisma.spacePrice.deleteMany({ where: { spaceId } });
    await addPrice(spaceId, 'MONTH', 40_000);

    expect(await storedSubscriptions()).toMatchObject([{ priceAgorot: 25_000, packageId: null }]);
  });

  it('a published price the space has not, with a label, or of another space, is invalid_choice on published, writing nothing', async () => {
    await addPrice(otherSpaceId, 'MONTH', 25_000);
    await prisma.spacePrice.create({
      data: { spaceId, period: 'WEEK', audience: 'GENERAL', amountAgorot: 9_000, labelAr: 'مسائي' },
    });

    for (const published of [
      { period: 'MONTH', audience: 'GENERAL', name: 'شهري' },
      { period: 'WEEK', audience: 'GENERAL', name: 'أسبوعي' },
      { period: 'WEEK', audience: 'GENERAL', shiftId: 999, name: 'أسبوعي' },
    ]) {
      const response = await subscribe(owner, { published });
      expect(response.status).toBe(422);
      expect(errorOf(response).errors).toEqual({ published: ['invalid_choice'] });
    }
    expect(await storedSubscriptions()).toEqual([]);
  });

  it('a published price with a package is invalid_choice on packageId; an hour price on its period', async () => {
    await addPrice(spaceId, 'HOUR', 500);
    const pack = await monthly();

    const both = await subscribe(owner, {
      packageId: pack.id,
      published: { period: 'MONTH', audience: 'GENERAL', name: 'شهري' },
    });
    expect(both.status).toBe(422);
    expect(errorOf(both).errors).toEqual({ packageId: ['invalid_choice'] });
    const hour = await subscribe(owner, {
      published: { period: 'HOUR', audience: 'GENERAL', name: 'ساعة' },
    });
    expect(hour.status).toBe(422);
    expect(errorOf(hour).errors).toEqual({ 'published.period': ['invalid_choice'] });
  });

  it('a custom subscription records who typed its price and why', async () => {
    const response = await subscribe(owner, examTerms());
    expect(response.status).toBe(201);
    expect(dataOf(response)).toMatchObject({
      subscription: {
        packageId: null,
        name: 'امتحانات',
        startsOn: '2026-10-21',
        endsOn: '2026-11-10',
        billing: 'PER_HOUR',
        priceAgorot: 500,
        audience: 'STUDENT',
        priceTyped: { byId: owner.id, reason: 'exam rate' },
        status: 'ACTIVE',
        dueAgorot: 0,
        paidAgorot: 0,
        balanceAgorot: 0,
      },
      payments: [],
      debtAgorot: 0,
    });
    expect(await storedSubscriptions()).toMatchObject([
      { packageId: null, priceSetById: owner.id, priceReason: 'exam rate' },
    ]);
    expect((await auditEntries())[0]?.after).toMatchObject({
      packageId: null,
      reason: 'exam rate',
    });

    // No end sent: none.
    const open = await subscribe(owner, examTerms({ endsOn: undefined, name: 'مفتوح' }));
    expect(open.status).toBe(201);
    expect(dataOf(open)).toMatchObject({ subscription: { name: 'مفتوح', endsOn: null } });

    // Another space's shift: refused on its field, writing nothing.
    const shift = await prisma.spaceShift.create({
      data: { spaceId: otherSpaceId, nameAr: 'صباحي', startsMinute: 480, endsMinute: 960 },
    });
    const foreign = await subscribe(owner, examTerms({ shiftId: shift.id }));
    expect(foreign.status).toBe(422);
    expect(errorOf(foreign).errors).toEqual({ 'custom.shiftId': ['invalid_choice'] });
    expect(await storedSubscriptions()).toHaveLength(2);
  });

  it('reception types a custom price only where the space allows it: 403 PRICE_TYPING_NOT_ALLOWED; the owner always may', async () => {
    const refused = await subscribe(reception, examTerms());
    expect(refused.status).toBe(403);
    expect(errorOf(refused).code).toBe('PRICE_TYPING_NOT_ALLOWED');
    expect(await storedSubscriptions()).toEqual([]);

    await prisma.spaceSettings.update({
      where: { spaceId },
      data: { receptionMayTypePrices: true },
    });
    const allowed = await subscribe(reception, examTerms());
    expect(allowed.status).toBe(201);
    expect(dataOf(allowed)).toMatchObject({
      subscription: { priceTyped: { byId: reception.id, reason: 'exam rate' } },
    });
  });

  it("an archived customer is CUSTOMER_ARCHIVED; another space's or an unknown customer not_found", async () => {
    const pack = await monthly();
    await prisma.customer.update({ where: { id: customerId }, data: { archivedAt: new Date() } });
    const archived = await subscribe(owner, { packageId: pack.id });
    expect(archived.status).toBe(409);
    expect(errorOf(archived).code).toBe('CUSTOMER_ARCHIVED');

    const { id: othersCustomer } = await createCustomer(otherSpaceId);
    for (const customer of [othersCustomer, 999_999]) {
      const response = await subscribe(owner, { packageId: pack.id }, { customer });
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    expect(await storedSubscriptions()).toEqual([]);
  });

  it('a retry with the same key answers the first subscription, 201; two at once make one', async () => {
    const pack = await monthly();
    const key = randomUUID();
    const first = await subscribe(owner, { packageId: pack.id }, { key });
    const retry = await subscribe(owner, { packageId: pack.id }, { key });
    expect([first.status, retry.status]).toEqual([201, 201]);
    expect(dataOf(retry)).toEqual(dataOf(first));
    expect(await storedSubscriptions()).toHaveLength(1);

    const together = randomUUID();
    const pending: Promise<request.Response>[] = [];
    // Both wait on the space's lock, so the second reads what the first committed.
    await prisma.$transaction(async (tx) => {
      await lockSpace(tx);
      pending.push(
        Promise.resolve(subscribe(owner, { packageId: pack.id }, { key: together })),
        Promise.resolve(subscribe(reception, { packageId: pack.id }, { key: together })),
      );
      await waitingOnLock({ count: 2 });
    });
    const [one, two] = await Promise.all(pending);
    expect([one?.status, two?.status]).toEqual([201, 201]);
    expect(dataOf(two as request.Response)).toEqual(dataOf(one as request.Response));
    expect(await storedSubscriptions()).toHaveLength(2);
  });

  it("a key that subscribed another customer is a conflict under this one's path, writing nothing", async () => {
    const pack = await monthly();
    const key = randomUUID();
    expect((await subscribe(owner, { packageId: pack.id }, { key })).status).toBe(201);
    const { id: omar } = await createCustomer(spaceId, { name: 'Omar' });

    const reused = await subscribe(owner, { packageId: pack.id }, { key, customer: omar });
    expect(reused.status).toBe(409);
    expect(errorOf(reused).type).toBe('conflict');
    expect(errorOf(reused).code).toBeUndefined();
    expect(await storedSubscriptions()).toHaveLength(1);
    expect((await auditEntries()).map(({ action }) => action)).toEqual(['subscription.created']);
  });

  it("refuses a missing key and an invalid body with 422 before anything is read; a stranger, another space's owner and the admin not_found", async () => {
    const missing = await subscribe(owner, { packageId: 1 }, { key: null, customer: 999_999 });
    expect(missing.status).toBe(422);
    expect(errorOf(missing).errors).toEqual({ idempotencyKey: ['required'] });

    const neither = await subscribe(owner, {}, { customer: 999_999 });
    expect(neither.status).toBe(422);
    expect(errorOf(neither).errors).toEqual({ packageId: ['invalid_choice'] });

    const noReason = await subscribe(owner, examTerms({ reason: undefined }), {
      customer: 999_999,
    });
    expect(noReason.status).toBe(422);
    expect(errorOf(noReason).errors).toEqual({ 'custom.reason': ['required'] });

    const pack = await monthly();
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await subscribe(caller, { packageId: pack.id });
      expect(response.status).toBe(404);
    }
    expect(await storedSubscriptions()).toEqual([]);
  });

  it('a reception link ended while the request waits is refused 403, writing nothing', async () => {
    const pack = await monthly();

    const response = await whileHeld(
      lockSpace,
      () => subscribe(reception, { packageId: pack.id }),
      (tx) =>
        tx.spaceManager.updateMany({
          where: { spaceId, userId: reception.id },
          data: { deactivatedAt: new Date() },
        }),
    );
    expect(response.status).toBe(403);
    expect(await storedSubscriptions()).toEqual([]);
  });

  it('the start date: the one sent; else today; an end before the start is out_of_range', async () => {
    const pack = await monthly();
    const later = await subscribe(owner, { packageId: pack.id, startsOn: '2026-11-01' });
    expect(later.status).toBe(201);
    expect(dataOf(later)).toMatchObject({
      subscription: { startsOn: '2026-11-01', endsOn: '2026-11-30', status: 'UPCOMING' },
    });

    const backwards = await subscribe(owner, {
      ...examTerms({ endsOn: '2026-10-31' }),
      startsOn: '2026-11-01',
    });
    expect(backwards.status).toBe(422);
    expect(errorOf(backwards).errors).toEqual({ 'custom.endsOn': ['out_of_range'] });
    expect(await storedSubscriptions()).toHaveLength(1);
  });
});
