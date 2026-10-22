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
import { waitingOnLock, whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

const app = createTestApp({ clock: () => new Date('2026-10-18T10:20:00+03:00') });
const PHONE = '+970599000123';
const OTHER_PHONE = '+970599000124';

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

/** A visit of the space closed by the auto check-out on 17 Oct at 18:00, with this charge. */
function closed(chargeAgorot: number | null, more: { customerId?: number; space?: number } = {}) {
  const { space = spaceId, ...data } = more;
  return createVisit(space, {
    ...stay('2026-10-17', '09:00', '18:00'),
    checkoutMethod: 'AUTO',
    chargeAgorot,
    ...data,
  });
}

/** A payment of the visit recorded by the owner, outside the API, through the given client. */
function paid(
  visitId: number,
  amountAgorot: number,
  client: Pick<typeof prisma, 'payment'> = prisma,
) {
  return client.payment.create({
    data: {
      spaceId,
      visitId,
      idempotencyKey: randomUUID(),
      recordedById: owner.id,
      method: 'CASH',
      amountAgorot,
    },
  });
}

/** Receives a payment as the caller, with this key (a new one unless told; `null` for none). */
function receive(
  caller: { authorization: string },
  body: object,
  key: string | null = randomUUID(),
) {
  const call = request(app)
    .post(`/api/v1/manage/spaces/${String(spaceId)}/payments`)
    .set('Authorization', caller.authorization);
  return (key === null ? call : call.set('Idempotency-Key', key)).send(body);
}

const cash = (visitId: number, amountAgorot: number, more: object = {}) => ({
  visitId,
  amountAgorot,
  method: 'CASH',
  ...more,
});

async function uncollectedIds() {
  const response = await request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/uncollected-visits`)
    .set('Authorization', owner.authorization);
  return (dataOf(response) as { visit: { id: number } }[]).map(({ visit }) => visit.id);
}

const storedVisit = (id: number) => prisma.visit.findUniqueOrThrow({ where: { id } });
const paymentCount = () => prisma.payment.count();
const lockSpace = (tx: Pick<typeof prisma, '$queryRaw'>) =>
  tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;

describe("receiving a visit's payment after its check-out", () => {
  it('the staff receive a payment for an uncollected visit: 201, recorded with who took it, with what was paid and what remains; audited payment.recorded', async () => {
    const { id } = await closed(2_500);
    await paid(id, 1_000);

    const response = await receive(reception, cash(id, 1_500, { note: ' the rest ' }));
    expect(response.status).toBe(201);
    const payment = await prisma.payment.findFirstOrThrow({
      where: { recordedById: reception.id },
    });
    expect(dataOf(response)).toMatchObject({
      visit: { id, customer: null, charge: { amountAgorot: 2_500 } },
      subscription: null,
      payment: {
        id: payment.id,
        amountAgorot: 1_500,
        method: 'CASH',
        note: 'the rest',
        receivedAt: '2026-10-18T07:20:00.000Z',
        recordedById: reception.id,
      },
      paidAgorot: 2_500,
      balanceAgorot: 0,
    });
    expect(await auditEntries()).toEqual([
      {
        actorId: reception.id,
        action: 'payment.recorded',
        entityType: 'payment',
        entityId: payment.id,
        spaceId,
        before: null,
        after: { visitId: id, amountAgorot: 1_500, method: 'CASH' },
      },
    ]);
  });

  it('paid in full, the visit leaves the uncollected visits', async () => {
    const { id } = await closed(2_500);
    expect(await uncollectedIds()).toEqual([id]);

    expect((await receive(owner, cash(id, 2_500))).status).toBe(201);
    expect(await uncollectedIds()).toEqual([]);
  });

  it('a part left unpaid on a visit with no customer needs a phone (422 required, writing nothing); with one, the customer is found or created, audited customer.created', async () => {
    const { id } = await closed(2_500);

    const noPhone = await receive(reception, cash(id, 1_000));
    expect(noPhone.status).toBe(422);
    expect(errorOf(noPhone).errors).toEqual({ phone: ['required'] });
    expect(await paymentCount()).toBe(0);
    expect(await auditEntries()).toEqual([]);

    const withPhone = await receive(reception, cash(id, 1_000, { phone: '059-900-0123' }));
    expect(withPhone.status).toBe(201);
    const customer = await prisma.customer.findFirstOrThrow();
    expect(customer).toMatchObject({ name: 'Omar', phone: PHONE });
    expect(dataOf(withPhone)).toMatchObject({
      visit: { customer: { id: customer.id, name: 'Omar', phone: PHONE } },
      paidAgorot: 1_000,
      balanceAgorot: 1_500,
    });
    expect(await storedVisit(id)).toMatchObject({ customerId: customer.id });
    expect((await auditEntries()).map(({ action }) => action)).toEqual([
      'payment.recorded',
      'customer.created',
      'visit.leftToCustomer',
    ]);

    // The same phone for another visit: the customer found, not created again.
    const other = await closed(2_000);
    const found = await receive(owner, cash(other.id, 500, { phone: PHONE, customerName: 'Rami' }));
    expect(found.status).toBe(201);
    expect(dataOf(found)).toMatchObject({ visit: { customer: { id: customer.id, name: 'Omar' } } });
    expect(await prisma.customer.count()).toBe(1);
  });

  it("a visit with a customer keeps it: no phone needed; another customer's phone is refused 409 VISIT_HAS_CUSTOMER, writing nothing", async () => {
    const sara = await createCustomer(spaceId, { phone: PHONE });
    await createCustomer(spaceId, { name: 'Huda', phone: OTHER_PHONE });
    const { id } = await closed(2_500, { customerId: sara.id });

    const kept = await receive(reception, cash(id, 1_000));
    expect(kept.status).toBe(201);
    expect(dataOf(kept)).toMatchObject({
      visit: { customer: { id: sara.id } },
      balanceAgorot: 1_500,
    });

    const own = await receive(reception, cash(id, 500, { phone: PHONE }));
    expect(own.status).toBe(201);

    const someoneElse = await receive(reception, cash(id, 500, { phone: OTHER_PHONE }));
    expect(someoneElse.status).toBe(409);
    expect(errorOf(someoneElse).code).toBe('VISIT_HAS_CUSTOMER');
    const unknown = await receive(reception, cash(id, 500, { phone: '+970599000999' }));
    expect(unknown.status).toBe(409);
    expect(errorOf(unknown).code).toBe('VISIT_HAS_CUSTOMER');

    expect(await paymentCount()).toBe(2);
    expect(await prisma.customer.count()).toBe(2);
    expect(await storedVisit(id)).toMatchObject({ customerId: sara.id });
  });

  it('the ledger refuses, before any phone is asked: above the balance PAYMENT_EXCEEDS_DUE; an unpriced visit VISIT_NOT_PRICED; a written-off one VISIT_WRITTEN_OFF — each writing nothing', async () => {
    const priced = await closed(2_500);
    await paid(priced.id, 1_000);
    const unpriced = await closed(null);
    const writtenOff = await closed(2_500);
    await prisma.visit.update({
      where: { id: writtenOff.id },
      data: { writtenOffAt: new Date(), writtenOffById: owner.id, writeOffReason: 'Left' },
    });

    for (const [body, code] of [
      [cash(priced.id, 1_600), 'PAYMENT_EXCEEDS_DUE'],
      [cash(unpriced.id, 1_000), 'VISIT_NOT_PRICED'],
      [cash(writtenOff.id, 1_000), 'VISIT_WRITTEN_OFF'],
    ] as const) {
      const response = await receive(reception, body);
      expect(response.status).toBe(409);
      expect(errorOf(response).code).toBe(code);
    }
    expect(await paymentCount()).toBe(1);
    expect(await auditEntries()).toEqual([]);
  });

  it('an open visit is refused 409 with no code: it is paid at its check-out', async () => {
    const open = await createVisit(spaceId, {
      checkedInAt: new Date('2026-10-18T09:00:00+03:00'),
      hourRateAgorot: 500,
    });

    const response = await receive(reception, cash(open.id, 500, { phone: PHONE }));
    expect(response.status).toBe(409);
    expect(errorOf(response)).toMatchObject({ type: 'conflict' });
    expect(errorOf(response).code).toBeUndefined();
    expect(await paymentCount()).toBe(0);
  });

  it('a retry with the same key answers 201 with the first payment and records nothing; a key that paid another item is a conflict', async () => {
    const { id } = await closed(2_500);
    const other = await closed(2_000);
    const key = randomUUID();

    const first = await receive(reception, cash(id, 2_500), key);
    expect(first.status).toBe(201);
    const retry = await receive(reception, cash(id, 2_500), key);
    expect(retry.status).toBe(201);
    expect(dataOf(retry)).toEqual(dataOf(first));
    expect(await paymentCount()).toBe(1);

    const reused = await receive(reception, cash(other.id, 2_000), key);
    expect(reused.status).toBe(409);
    expect(errorOf(reused).code).toBeUndefined();
    expect(await paymentCount()).toBe(1);
  });

  it('two requests with one key at once record one payment, both answered 201 with it', async () => {
    const { id } = await closed(2_500);
    const key = randomUUID();
    const pending: Promise<request.Response>[] = [];
    await prisma.$transaction(async (tx) => {
      await lockSpace(tx);
      pending.push(
        Promise.resolve(receive(owner, cash(id, 2_500), key)),
        Promise.resolve(receive(reception, cash(id, 2_500), key)),
      );
      await waitingOnLock({ count: 2 });
    });

    const answers = await Promise.all(pending);
    expect(answers.map(({ status }) => status)).toEqual([201, 201]);
    expect(dataOf(answers[1] as request.Response)).toEqual(dataOf(answers[0] as request.Response));
    expect(await paymentCount()).toBe(1);
  });

  it("two desks at once: the second sees the first's payment, so its rest is settled and needs no phone", async () => {
    const { id } = await closed(2_000);

    const response = await whileHeld(
      lockSpace,
      () => receive(reception, cash(id, 1_000)),
      (tx) => paid(id, 1_000, tx),
    );
    expect(response.status).toBe(201);
    expect(dataOf(response)).toMatchObject({ paidAgorot: 2_000, balanceAgorot: 0 });
    expect(await paymentCount()).toBe(2);
  });

  it('a payment waiting while the owner writes the visit off is refused VISIT_WRITTEN_OFF', async () => {
    const { id } = await closed(2_500);

    const response = await whileHeld(
      lockSpace,
      () => receive(reception, cash(id, 2_500)),
      (tx) =>
        tx.visit.update({
          where: { id },
          data: { writtenOffAt: new Date(), writtenOffById: owner.id, writeOffReason: 'Left' },
        }),
    );
    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('VISIT_WRITTEN_OFF');
    expect(await paymentCount()).toBe(0);
  });

  it('a reception link ended while the payment waits is refused 403, writing nothing', async () => {
    const { id } = await closed(2_500);

    const response = await whileHeld(
      lockSpace,
      () => receive(reception, cash(id, 2_500)),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: reception.id } },
          data: { deactivatedAt: new Date() },
        }),
    );
    expect(response.status).toBe(403);
    expect(errorOf(response).type).toBe('forbidden');
    expect(await paymentCount()).toBe(0);
  });

  it("answers the owner and reception; refuses a stranger, another space's owner and the admin with not_found; a visit of another space is not_found", async () => {
    const { id } = await closed(2_500);
    for (const caller of [owner, reception]) {
      expect((await receive(caller, cash(id, 1_000, { phone: PHONE }))).status).toBe(201);
    }
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await receive(caller, cash(id, 500));
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }

    const theirs = await closed(2_500, { space: otherSpaceId });
    const response = await receive(owner, cash(theirs.id, 500));
    expect(response.status).toBe(404);
    expect(await paymentCount()).toBe(2);
  });

  it('refuses a missing or invalid key, and an invalid body, with 422 before anything is read', async () => {
    const { id } = await closed(2_500);

    const missing = await receive(reception, cash(id, 2_500), null);
    expect(missing.status).toBe(422);
    expect(errorOf(missing).errors).toEqual({ idempotencyKey: ['required'] });
    const malformed = await receive(reception, cash(id, 2_500), 'not-a-uuid');
    expect(malformed.status).toBe(422);
    expect(errorOf(malformed).errors).toEqual({ idempotencyKey: ['invalid_format'] });
    const invalid = await receive(reception, { amountAgorot: 0, method: 'CASH' });
    expect(invalid.status).toBe(422);
    expect(errorOf(invalid).errors).toEqual({
      visitId: ['required'],
      amountAgorot: ['out_of_range'],
    });
    expect(await paymentCount()).toBe(0);
  });
});

describe("receiving a subscription's payment", () => {
  /** Sara's subscription of the space (another's when told): a month at ₪300, unless overridden. */
  async function subscription(more: Record<string, unknown> = {}, space = spaceId) {
    const customer = await createCustomer(space, { name: 'Sara', phone: PHONE });
    return createSubscription(customer, {
      startsOn: new Date('2026-10-01'),
      endsOn: new Date('2026-10-30'),
      billing: 'FIXED',
      priceAgorot: 30_000,
      ...more,
    });
  }

  const onSubscription = (subscriptionId: number, amountAgorot: number) => ({
    subscriptionId,
    amountAgorot,
    method: 'CASH',
  });

  it('a payment on a subscription of the space is recorded, 201, with what remains; audited payment.recorded; a retry answers it', async () => {
    const { id, customerId } = await subscription();
    const key = randomUUID();

    const response = await receive(reception, onSubscription(id, 10_000), key);
    expect(response.status).toBe(201);
    const payment = await prisma.payment.findFirstOrThrow();
    expect(payment).toMatchObject({ subscriptionId: id, visitId: null, amountAgorot: 10_000 });
    expect(dataOf(response)).toEqual({
      visit: null,
      subscription: expect.objectContaining({
        id,
        customerId,
        status: 'ACTIVE',
        dueAgorot: 30_000,
      }) as unknown,
      payment: {
        id: payment.id,
        amountAgorot: 10_000,
        method: 'CASH',
        note: null,
        receivedAt: '2026-10-18T07:20:00.000Z',
        recordedById: reception.id,
      },
      paidAgorot: 10_000,
      balanceAgorot: 20_000,
    });
    expect(await auditEntries()).toEqual([
      {
        actorId: reception.id,
        action: 'payment.recorded',
        entityType: 'payment',
        entityId: payment.id,
        spaceId,
        before: null,
        after: { subscriptionId: id, amountAgorot: 10_000, method: 'CASH' },
      },
    ]);

    const retry = await receive(reception, onSubscription(id, 10_000), key);
    expect(retry.status).toBe(201);
    expect(dataOf(retry)).toEqual(dataOf(response));
    expect(await paymentCount()).toBe(1);
  });

  it('a fixed subscription is never paid above its price: PAYMENT_EXCEEDS_DUE, writing nothing; a per-hour one takes credit', async () => {
    const { id } = await subscription();
    expect((await receive(owner, onSubscription(id, 25_000))).status).toBe(201);

    const above = await receive(owner, onSubscription(id, 10_000));
    expect(above.status).toBe(409);
    expect(errorOf(above).code).toBe('PAYMENT_EXCEEDS_DUE');
    expect(await paymentCount()).toBe(1);

    // Nothing attended yet: ₪50 paid ahead is credit, a balance below zero.
    const hourly = await createSubscription(await createCustomer(spaceId, { name: 'Rami' }), {
      billing: 'PER_HOUR',
      priceAgorot: 500,
    });
    const credit = await receive(owner, onSubscription(hourly.id, 5_000));
    expect(credit.status).toBe(201);
    expect(dataOf(credit)).toMatchObject({ paidAgorot: 5_000, balanceAgorot: -5_000 });
  });

  it('exactly one item: both or neither refused 422 before anything is read', async () => {
    const { id } = await subscription();
    const visit = await closed(2_500);

    const both = await receive(owner, { ...onSubscription(id, 1_000), visitId: visit.id });
    expect(both.status).toBe(422);
    expect(errorOf(both).errors).toEqual({ subscriptionId: ['invalid_choice'] });
    const neither = await receive(owner, { amountAgorot: 1_000, method: 'CASH' });
    expect(neither.status).toBe(422);
    expect(errorOf(neither).errors).toEqual({ visitId: ['required'] });
    expect(await paymentCount()).toBe(0);
  });

  it("another space's subscription is invalid_choice on subscriptionId; a key that paid a visit is a conflict, and the reverse", async () => {
    const theirs = await subscription({}, otherSpaceId);
    const foreign = await receive(owner, onSubscription(theirs.id, 1_000));
    expect(foreign.status).toBe(422);
    expect(errorOf(foreign).errors).toEqual({ subscriptionId: ['invalid_choice'] });

    const { id } = await subscription();
    const visit = await closed(2_500);
    const visitKey = randomUUID();
    expect(
      (await receive(owner, cash(visit.id, 1_000, { phone: OTHER_PHONE }), visitKey)).status,
    ).toBe(201);
    const reused = await receive(owner, onSubscription(id, 1_000), visitKey);
    expect(reused.status).toBe(409);
    expect(errorOf(reused).code).toBeUndefined();

    const subscriptionKey = randomUUID();
    expect((await receive(owner, onSubscription(id, 1_000), subscriptionKey)).status).toBe(201);
    const reusedForVisit = await receive(owner, cash(visit.id, 500), subscriptionKey);
    expect(reusedForVisit.status).toBe(409);
    expect(await paymentCount()).toBe(2);
  });

  it("an ended subscription, and an archived customer's, still take a payment", async () => {
    const ended = await subscription({
      endsOn: new Date('2026-10-12'),
      endedAt: new Date('2026-10-12T09:00:00+03:00'),
      endedById: owner.id,
    });
    const response = await receive(owner, onSubscription(ended.id, 5_000));
    expect(response.status).toBe(201);
    expect(dataOf(response)).toMatchObject({ subscription: { status: 'EXPIRED' } });

    await prisma.customer.update({
      where: { id: ended.customerId },
      data: { archivedAt: new Date() },
    });
    expect((await receive(owner, onSubscription(ended.id, 5_000))).status).toBe(201);
    expect(await paymentCount()).toBe(2);
  });
});
