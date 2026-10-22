import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import {
  createCustomer,
  createSpace,
  createSubscription,
  createVisit,
  stay,
} from '../../../test/factories.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';
import { derivedKey } from '../../shared/http/index.ts';

// Renewing a subscription, and a subscribe's payment allocated by the server, oldest debt first
// (docs/api/api-contract.md › Subscriptions (managed)), on Wednesday 21 October 2026 in Gaza.
const app = createTestApp({ clock: () => new Date('2026-10-21T10:00:00+03:00') });

let spaceId: number;
let otherSpaceId: number;
let customerId: number;
let packageId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  ({ id: otherSpaceId } = await createSpace('other-space'));
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
  ({ id: customerId } = await createCustomer(spaceId, { name: 'Sara' }));
  // A month at ₪300, fixed.
  ({ id: packageId } = await prisma.package.create({
    data: { spaceId, name: 'شهري', validityDays: 30, billing: 'FIXED', priceAgorot: 30_000 },
  }));
});

/** Subscribes Sara (or `customer`) as the caller, with this key (a new one unless told). */
function subscribe(
  caller: { authorization: string },
  body: object,
  { key = randomUUID(), customer = customerId }: { key?: string; customer?: number } = {},
) {
  return request(app)
    .post(`/api/v1/manage/spaces/${String(spaceId)}/customers/${String(customer)}/subscriptions`)
    .set('Authorization', caller.authorization)
    .set('Idempotency-Key', key)
    .send(body);
}

/** Sara's subscription of the space, made directly: a month at ₪300 from 1 October, unless told. */
function existing(more: Record<string, unknown> = {}, customer = customerId) {
  return createSubscription(
    { id: customer, spaceId },
    {
      startsOn: new Date('2026-10-01'),
      endsOn: new Date('2026-10-30'),
      priceAgorot: 30_000,
      ...more,
    },
  );
}

/** A closed visit of Sara's still owed on: ₪15, on Saturday 17 October. */
function owedVisit() {
  return createVisit(spaceId, {
    ...stay('2026-10-17', '09:00', '18:00'),
    customerId,
    chargeAgorot: 1_500,
  });
}

const cash = (amountAgorot: number) => ({ amountAgorot, method: 'CASH' });
const storedPayments = () =>
  prisma.payment.findMany({
    select: { visitId: true, subscriptionId: true, amountAgorot: true, idempotencyKey: true },
    orderBy: { id: 'asc' },
  });
const lockSpace = (tx: Pick<typeof prisma, '$queryRaw'>) =>
  tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;
type Answer = { subscription: { id: number }; payments: unknown[]; debtAgorot: number };

describe('renewing a subscription', () => {
  it("a renewal starts the day after the running one's end, or today once it expired", async () => {
    const running = await existing();
    const renewal = await subscribe(reception, { packageId, renewalOfId: running.id });
    expect(renewal.status).toBe(201);
    expect(dataOf(renewal)).toMatchObject({
      subscription: {
        renewalOfId: running.id,
        startsOn: '2026-10-31',
        endsOn: '2026-11-29',
        status: 'UPCOMING',
      },
    });

    const expired = await existing({
      startsOn: new Date('2026-09-10'),
      endsOn: new Date('2026-10-09'),
    });
    const late = await subscribe(reception, { packageId, renewalOfId: expired.id });
    expect(late.status).toBe(201);
    expect(dataOf(late)).toMatchObject({
      subscription: { renewalOfId: expired.id, startsOn: '2026-10-21', endsOn: '2026-11-19' },
    });
  });

  it('an amount pays the older debts oldest first, one payment each, the rest to the new subscription; CUSTOMER_HAS_DEBT when one remains', async () => {
    const visit = await owedVisit();
    const older = await existing({ priceAgorot: 5_000 });

    const response = await subscribe(reception, { packageId, payment: cash(4_000) });
    expect(response.status).toBe(201);
    const { subscription } = dataOf(response) as Answer;
    expect(await storedPayments()).toMatchObject([
      { visitId: visit.id, subscriptionId: null, amountAgorot: 1_500 },
      { visitId: null, subscriptionId: older.id, amountAgorot: 2_500 },
    ]);
    expect(dataOf(response)).toMatchObject({
      subscription: { id: subscription.id, paidAgorot: 0, balanceAgorot: 30_000 },
      payments: [
        { item: { visitId: visit.id }, payment: { amountAgorot: 1_500, method: 'CASH' } },
        { item: { subscriptionId: older.id }, payment: { amountAgorot: 2_500, method: 'CASH' } },
      ],
      debtAgorot: 2_500 + 30_000,
    });
    expect((response.body as { meta?: object }).meta).toEqual({ warnings: ['CUSTOMER_HAS_DEBT'] });
  });

  it('an amount that settles every older debt pays the rest on the new one, with no warning', async () => {
    const visit = await owedVisit();
    const older = await existing({ priceAgorot: 5_000 });

    const response = await subscribe(owner, { packageId, payment: cash(10_000) });
    expect(response.status).toBe(201);
    expect(dataOf(response)).toMatchObject({
      subscription: { paidAgorot: 3_500, balanceAgorot: 26_500 },
      payments: [
        { item: { visitId: visit.id }, payment: { amountAgorot: 1_500 } },
        { item: { subscriptionId: older.id }, payment: { amountAgorot: 5_000 } },
        { item: { subscriptionId: (dataOf(response) as Answer).subscription.id } },
      ],
      debtAgorot: 26_500,
    });
    expect((response.body as { meta?: object }).meta).toBeUndefined();
  });

  it('a rest above a fixed new price is PAYMENT_EXCEEDS_DUE and nothing is written: no subscription, no payment', async () => {
    await owedVisit();

    const response = await subscribe(reception, { packageId, payment: cash(1_500 + 30_001) });
    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('PAYMENT_EXCEEDS_DUE');
    expect(await prisma.subscription.count()).toBe(0);
    expect(await storedPayments()).toEqual([]);
    expect(await auditEntries()).toEqual([]);
  });

  it("a retry answers the same subscription and the same payments, their keys derived from the request's", async () => {
    await owedVisit();
    const key = randomUUID();

    const first = await subscribe(reception, { packageId, payment: cash(5_000) }, { key });
    const retry = await subscribe(reception, { packageId, payment: cash(5_000) }, { key });
    expect([first.status, retry.status]).toEqual([201, 201]);
    expect(dataOf(retry)).toEqual(dataOf(first));
    expect(await prisma.subscription.count()).toBe(1);
    expect((await storedPayments()).map(({ idempotencyKey }) => idempotencyKey)).toEqual([
      derivedKey(key, 0),
      derivedKey(key, 1),
    ]);
  });

  it('a retry after its own renewal, still unpaid, warns of no debt: the renewal is newer', async () => {
    const key = randomUUID();
    const first = await subscribe(reception, { packageId }, { key });
    expect((first.body as { meta?: object }).meta).toBeUndefined();
    const { subscription } = dataOf(first) as Answer;
    const renewal = await subscribe(reception, { packageId, renewalOfId: subscription.id });
    expect(renewal.status).toBe(201);

    const retry = await subscribe(reception, { packageId }, { key });
    expect(retry.status).toBe(201);
    expect(dataOf(retry)).toMatchObject({ subscription: { id: subscription.id } });
    expect((retry.body as { meta?: object }).meta).toBeUndefined();
  });

  it('the payments are audited each, payment.recorded, after subscription.created', async () => {
    const visit = await owedVisit();

    const response = await subscribe(reception, { packageId, payment: cash(2_000) });
    expect(response.status).toBe(201);
    const { subscription } = dataOf(response) as Answer;
    expect((await auditEntries()).map(({ action, after }) => ({ action, after }))).toEqual([
      { action: 'subscription.created', after: expect.objectContaining({ packageId }) as unknown },
      {
        action: 'payment.recorded',
        after: { visitId: visit.id, amountAgorot: 1_500, method: 'CASH' },
      },
      {
        action: 'payment.recorded',
        after: { subscriptionId: subscription.id, amountAgorot: 500, method: 'CASH' },
      },
    ]);
  });

  it("a renewal of another customer's subscription, or another space's, is invalid_choice on renewalOfId", async () => {
    const { id: rami } = await createCustomer(spaceId, { name: 'Rami' });
    const ramis = await existing({}, rami);
    const { id: theirCustomer } = await createCustomer(otherSpaceId, { name: 'Omar' });
    const theirs = await createSubscription({ id: theirCustomer, spaceId: otherSpaceId });

    for (const renewalOfId of [ramis.id, theirs.id]) {
      const response = await subscribe(owner, { packageId, renewalOfId });
      expect(response.status).toBe(422);
      expect(errorOf(response).errors).toEqual({ renewalOfId: ['invalid_choice'] });
    }
    expect(await prisma.subscription.count()).toBe(2);
  });

  it("two desks paying one debt: the second, while waiting, sees the first's payment and pays only what is left", async () => {
    const visit = await owedVisit();
    const older = await existing({ priceAgorot: 5_000 });

    const response = await whileHeld(
      lockSpace,
      () => subscribe(reception, { packageId, payment: cash(4_000) }),
      (tx) =>
        tx.payment.create({
          data: {
            spaceId,
            visitId: visit.id,
            idempotencyKey: randomUUID(),
            recordedById: owner.id,
            method: 'CASH',
            amountAgorot: 1_500,
          },
        }),
    );
    expect(response.status).toBe(201);
    expect(dataOf(response)).toMatchObject({
      payments: [{ item: { subscriptionId: older.id }, payment: { amountAgorot: 4_000 } }],
    });
  });

  it('a subscription is renewed once: a second renewal is SUBSCRIPTION_ALREADY_RENEWED, also one made while it waited', async () => {
    const running = await existing();
    expect((await subscribe(owner, { packageId, renewalOfId: running.id })).status).toBe(201);
    const again = await subscribe(reception, { packageId, renewalOfId: running.id });
    expect(again.status).toBe(409);
    expect(errorOf(again).code).toBe('SUBSCRIPTION_ALREADY_RENEWED');

    const other = await existing({ startsOn: new Date('2026-10-05') });
    const raced = await whileHeld(
      lockSpace,
      () => subscribe(reception, { packageId, renewalOfId: other.id }),
      (tx) =>
        tx.subscription.create({
          data: {
            spaceId,
            customerId,
            idempotencyKey: randomUUID(),
            renewalOfId: other.id,
            name: 'شهري',
            billing: 'FIXED',
            priceAgorot: 30_000,
          },
        }),
    );
    expect(raced.status).toBe(409);
    expect(errorOf(raced).code).toBe('SUBSCRIPTION_ALREADY_RENEWED');
    expect(await prisma.subscription.count()).toBe(4);
  });
});
