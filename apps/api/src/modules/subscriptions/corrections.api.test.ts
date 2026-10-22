import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createCustomer, createSpace, createSubscription } from '../../../test/factories.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// Correcting a subscription (docs/api/api-contract.md › Subscriptions (managed)): its limits, dates
// and name by the staff; its price and billing by the owner, with a reason. On 21 October 2026.
const app = createTestApp({ clock: () => new Date('2026-10-21T10:00:00+03:00') });

let spaceId: number;
let otherSpaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };
let stranger: { id: number; authorization: string };
let admin: { id: number; authorization: string };
let subscriptionId: number;

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
  // A month at ₪300, five days a week.
  ({ id: subscriptionId } = await createSubscription(await createCustomer(spaceId), {
    name: 'شهري',
    startsOn: new Date('2026-10-01'),
    endsOn: new Date('2026-10-30'),
    daysPerWeek: 5,
    billing: 'FIXED',
    priceAgorot: 30_000,
  }));
});

const path = (id: number) => `/api/v1/manage/spaces/${String(spaceId)}/subscriptions/${String(id)}`;

function correct(caller: { authorization: string }, body: object, id = subscriptionId) {
  return request(app).patch(path(id)).set('Authorization', caller.authorization).send(body);
}

function correctPrice(caller: { authorization: string }, body: object, id = subscriptionId) {
  return request(app)
    .put(`${path(id)}/price`)
    .set('Authorization', caller.authorization)
    .send(body);
}

const stored = () => prisma.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });
const lockSpace = (tx: Pick<typeof prisma, '$queryRaw'>) =>
  tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;

function pay(amountAgorot: number, client: Pick<typeof prisma, 'payment'> = prisma) {
  return client.payment.create({
    data: {
      spaceId,
      subscriptionId,
      idempotencyKey: randomUUID(),
      recordedById: owner.id,
      method: 'CASH',
      amountAgorot,
    },
  });
}

describe('correcting a subscription', () => {
  it('the staff correct limits, dates and the name, audited subscription.corrected with only what changed; the same values write nothing', async () => {
    const response = await correct(reception, {
      name: 'شهري — مسائي',
      startsOn: '2026-10-01',
      endsOn: '2026-11-05',
      daysPerWeek: null,
      totalHours: 40,
    });
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      id: subscriptionId,
      name: 'شهري — مسائي',
      startsOn: '2026-10-01',
      endsOn: '2026-11-05',
      daysPerWeek: null,
      totalHours: 40,
      status: 'ACTIVE',
    });
    expect(await stored()).toMatchObject({
      name: 'شهري — مسائي',
      endsOn: new Date('2026-11-05'),
      daysPerWeek: null,
      totalHours: 40,
    });
    expect(await auditEntries()).toEqual([
      {
        actorId: reception.id,
        action: 'subscription.corrected',
        entityType: 'subscription',
        entityId: subscriptionId,
        spaceId,
        before: { name: 'شهري', endsOn: '2026-10-30', daysPerWeek: 5, totalHours: null },
        after: { name: 'شهري — مسائي', endsOn: '2026-11-05', daysPerWeek: null, totalHours: 40 },
      },
    ]);

    const same = await correct(owner, { name: 'شهري — مسائي', endsOn: '2026-11-05' });
    expect(same.status).toBe(200);
    expect(await auditEntries()).toHaveLength(1);
  });

  it('an end before the start is out_of_range; an ended subscription is SUBSCRIPTION_ENDED, also for its price', async () => {
    const backwards = await correct(owner, { startsOn: '2026-11-01' });
    expect(backwards.status).toBe(422);
    expect(errorOf(backwards).errors).toEqual({ endsOn: ['out_of_range'] });

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { endsOn: new Date('2026-10-20'), endedAt: new Date(), endedById: owner.id },
    });
    const ended = await correct(owner, { daysPerWeek: 3 });
    expect(ended.status).toBe(409);
    expect(errorOf(ended).code).toBe('SUBSCRIPTION_ENDED');
    const endedPrice = await correctPrice(owner, {
      billing: 'FIXED',
      priceAgorot: 20_000,
      reason: 'Agreed',
    });
    expect(endedPrice.status).toBe(409);
    expect(errorOf(endedPrice).code).toBe('SUBSCRIPTION_ENDED');
    expect(await auditEntries()).toEqual([]);
  });

  it('a reception link ended while the correction waits is refused 403, writing nothing', async () => {
    const response = await whileHeld(
      lockSpace,
      () => correct(reception, { daysPerWeek: 3 }),
      (tx) =>
        tx.spaceManager.updateMany({
          where: { spaceId, userId: reception.id },
          data: { deactivatedAt: new Date() },
        }),
    );
    expect(response.status).toBe(403);
    expect(await stored()).toMatchObject({ daysPerWeek: 5 });
  });

  it('the owner corrects the price and billing with a reason, recorded as the price typed, audited subscription.priceCorrected; reception 403 before the body is read', async () => {
    const refused = await correctPrice(reception, { billing: 'NOT_A_BILLING' });
    expect(refused.status).toBe(403);

    const response = await correctPrice(owner, {
      billing: 'PER_DAY',
      priceAgorot: 2_000,
      reason: ' Comes three days a week ',
    });
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      billing: 'PER_DAY',
      priceAgorot: 2_000,
      priceTyped: { byId: owner.id, reason: 'Comes three days a week' },
      dueAgorot: 0,
    });
    expect(await stored()).toMatchObject({
      priceSetById: owner.id,
      priceReason: 'Comes three days a week',
    });
    expect(await auditEntries()).toEqual([
      {
        actorId: owner.id,
        action: 'subscription.priceCorrected',
        entityType: 'subscription',
        entityId: subscriptionId,
        spaceId,
        before: { billing: 'FIXED', priceAgorot: 30_000 },
        after: { billing: 'PER_DAY', priceAgorot: 2_000, reason: 'Comes three days a week' },
      },
    ]);

    const same = await correctPrice(owner, {
      billing: 'PER_DAY',
      priceAgorot: 2_000,
      reason: 'Again',
    });
    expect(same.status).toBe(200);
    expect(await auditEntries()).toHaveLength(1);
  });

  it('a fixed price below what is paid is PRICE_BELOW_PAID, writing nothing', async () => {
    await pay(25_000);

    const response = await correctPrice(owner, {
      billing: 'FIXED',
      priceAgorot: 20_000,
      reason: 'Discount',
    });
    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('PRICE_BELOW_PAID');
    expect(await stored()).toMatchObject({ priceAgorot: 30_000, priceSetById: null });
    expect(await auditEntries()).toEqual([]);
  });

  it('a payment that waited while the owner lowered the price is refused PAYMENT_EXCEEDS_DUE', async () => {
    await pay(5_000);

    const response = await whileHeld(
      lockSpace,
      () =>
        request(app)
          .post(`/api/v1/manage/spaces/${String(spaceId)}/payments`)
          .set('Authorization', reception.authorization)
          .set('Idempotency-Key', randomUUID())
          .send({ subscriptionId, amountAgorot: 20_000, method: 'CASH' }),
      (tx) =>
        tx.subscription.update({
          where: { id: subscriptionId },
          data: { priceAgorot: 10_000, priceSetById: owner.id, priceReason: 'Discount' },
        }),
    );
    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('PAYMENT_EXCEEDS_DUE');
    expect(await prisma.payment.count()).toBe(1);
  });

  it("another space's subscription is not_found; so is any to a stranger and the admin", async () => {
    const theirs = await createSubscription(await createCustomer(otherSpaceId));
    expect((await correct(owner, { daysPerWeek: 3 }, theirs.id)).status).toBe(404);
    expect(
      (await correctPrice(owner, { billing: 'FIXED', priceAgorot: 100, reason: 'x' }, theirs.id))
        .status,
    ).toBe(404);
    for (const caller of [stranger, admin]) {
      expect((await correct(caller, { daysPerWeek: 3 })).status).toBe(404);
    }
  });
});
