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

// The owner's void of a payment (ADR 0010 rules 3–5; docs/api/api-contract.md › Front desk
// (managed)): one row's void columns, answered as the payments list shows it; every figure derived.

const NOW = new Date('2026-10-24T10:00:00+03:00');
const RECEIVED = new Date('2026-10-23T12:00:00+03:00');
const app = createTestApp({ clock: () => NOW });
const REASON = 'Recorded twice';

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

/** A visit of the space closed by hand on 23 Oct, with this charge and customer. */
function closed(
  chargeAgorot: number,
  { customerId = null, space = spaceId }: { customerId?: number | null; space?: number } = {},
) {
  return createVisit(space, { ...stay('2026-10-23', '09:00', '12:00'), chargeAgorot, customerId });
}

type Item = { visitId: number } | { subscriptionId: number };

/** A payment by reception, received on 23 Oct, through the given client (a test transaction or not). */
function pay(
  item: Item,
  amountAgorot: number,
  {
    client = prisma,
    space = spaceId,
    recordedById = reception.id,
  }: { client?: Pick<typeof prisma, 'payment'>; space?: number; recordedById?: number } = {},
) {
  return client.payment.create({
    data: {
      spaceId: space,
      ...item,
      idempotencyKey: randomUUID(),
      recordedById,
      method: 'CASH',
      amountAgorot,
      receivedAt: RECEIVED,
    },
  });
}

function voidIt(
  caller: { authorization: string },
  paymentId: number | string,
  body: object = { reason: REASON },
) {
  return request(app)
    .post(`/api/v1/manage/spaces/${String(spaceId)}/payments/${String(paymentId)}/void`)
    .set('Authorization', caller.authorization)
    .send(body);
}

const get = (path: string) =>
  request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}${path}`)
    .set('Authorization', owner.authorization);

const storedVoid = (id: number) =>
  prisma.payment.findUniqueOrThrow({
    where: { id },
    select: { voidedAt: true, voidedById: true, voidReason: true },
  });
const NOT_VOIDED = { voidedAt: null, voidedById: null, voidReason: null };
const lockSpace = (tx: Pick<typeof prisma, '$queryRaw'>) =>
  tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;

describe('voiding a payment', () => {
  it('the owner voids a payment with a reason: 200 with the row, its void at now by the owner with the reason; audited payment.voided', async () => {
    const visit = await closed(2_000);
    const { id } = await prisma.payment.create({
      data: {
        spaceId,
        visitId: visit.id,
        idempotencyKey: randomUUID(),
        recordedById: reception.id,
        method: 'TRANSFER',
        amountAgorot: 2_000,
        note: 'Bank of Palestine',
        receivedAt: RECEIVED,
      },
    });

    const response = await voidIt(owner, id);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toEqual({
      id,
      amountAgorot: 2_000,
      method: 'TRANSFER',
      note: 'Bank of Palestine',
      receivedAt: '2026-10-23T09:00:00.000Z',
      item: { kind: 'VISIT', id: visit.id, visitorName: 'Omar' },
      customer: null,
      recordedBy: { id: reception.id, name: 'Sara' },
      voided: {
        at: '2026-10-24T07:00:00.000Z',
        by: { id: owner.id, name: 'Ahmad' },
        reason: REASON,
      },
    });
    expect(await storedVoid(id)).toEqual({
      voidedAt: NOW,
      voidedById: owner.id,
      voidReason: REASON,
    });
    expect(await auditEntries()).toEqual([
      {
        actorId: owner.id,
        action: 'payment.voided',
        entityType: 'payment',
        entityId: id,
        spaceId,
        before: null,
        after: { visitId: visit.id, amountAgorot: 2_000, method: 'TRANSFER', reason: REASON },
      },
    ]);
  });

  it('reception is 403 before the body is read (an empty body), a stranger, another space’s owner and the admin not_found', async () => {
    const visit = await closed(2_000);
    const { id } = await pay({ visitId: visit.id }, 2_000);

    const refused = await voidIt(reception, id, {});
    expect(refused.status).toBe(403);
    expect(errorOf(refused).type).toBe('forbidden');
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await voidIt(caller, id);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    expect(await storedVoid(id)).toEqual(NOT_VOIDED);
    expect(await auditEntries()).toEqual([]);
  });

  it('a missing or blank reason is 422, writing nothing', async () => {
    const visit = await closed(2_000);
    const { id } = await pay({ visitId: visit.id }, 2_000);

    const missing = await voidIt(owner, id, {});
    expect(missing.status).toBe(422);
    expect(errorOf(missing).errors).toEqual({ reason: ['required'] });
    const blank = await voidIt(owner, id, { reason: '   ' });
    expect(blank.status).toBe(422);
    expect(errorOf(blank).errors).toEqual({ reason: ['too_short'] });
    expect(await storedVoid(id)).toEqual(NOT_VOIDED);
    expect(await auditEntries()).toEqual([]);
  });

  it('a second void answers it as it is, its first reason and voider, writing nothing and auditing nothing', async () => {
    const visit = await closed(2_000);
    const { id } = await pay({ visitId: visit.id }, 2_000);
    const first = await voidIt(owner, id);
    expect(first.status).toBe(200);

    const secondOwner = await signInOwnerOf(spaceId);
    const again = await voidIt(secondOwner, id, { reason: 'Wrong amount' });
    expect(again.status).toBe(200);
    expect(dataOf(again)).toEqual(dataOf(first));
    expect(dataOf(again)).toMatchObject({
      voided: { by: { id: owner.id }, reason: REASON },
    });
    expect(await storedVoid(id)).toEqual({
      voidedAt: NOW,
      voidedById: owner.id,
      voidReason: REASON,
    });
    expect((await auditEntries()).map(({ action }) => action)).toEqual(['payment.voided']);
  });

  it("another space's payment, or an unknown id, is not_found", async () => {
    const theirs = await closed(2_000, { space: otherSpaceId });
    const { id } = await pay({ visitId: theirs.id }, 2_000, {
      space: otherSpaceId,
      recordedById: unrelatedOwner.id,
    });

    for (const paymentId of [id, 999_999, 'abc']) {
      const response = await voidIt(owner, paymentId);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    expect(await storedVoid(id)).toEqual(NOT_VOIDED);
    expect(await auditEntries()).toEqual([]);
  });

  it('an owner whose link ended while the void waits on the space’s lock is 403, writing nothing', async () => {
    const visit = await closed(2_000);
    const { id } = await pay({ visitId: visit.id }, 2_000);

    const response = await whileHeld(
      lockSpace,
      () => voidIt(owner, id),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: owner.id } },
          data: { deactivatedAt: new Date() },
        }),
    );
    expect(response.status).toBe(403);
    expect(await storedVoid(id)).toEqual(NOT_VOIDED);
    expect(await auditEntries()).toEqual([]);
  });
});

describe('a written-off visit', () => {
  it("a written-off visit's payment is VISIT_WRITTEN_OFF, writing nothing; once the write-off is undone it is voided", async () => {
    const visit = await closed(2_000);
    const { id } = await pay({ visitId: visit.id }, 1_000);
    const writeOff = `/api/v1/manage/spaces/${String(spaceId)}/visits/${String(visit.id)}/write-off`;
    const wrote = await request(app)
      .post(writeOff)
      .set('Authorization', owner.authorization)
      .send({ reason: 'Left' });
    expect(wrote.status).toBe(200);

    const refused = await voidIt(owner, id);
    expect(refused.status).toBe(409);
    expect(errorOf(refused)).toMatchObject({ type: 'conflict', code: 'VISIT_WRITTEN_OFF' });
    expect(await storedVoid(id)).toEqual(NOT_VOIDED);

    const undone = await request(app).delete(writeOff).set('Authorization', owner.authorization);
    expect(undone.status).toBe(200);
    const voided = await voidIt(owner, id);
    expect(voided.status).toBe(200);
    expect(await storedVoid(id)).toMatchObject({ voidReason: REASON });
    expect((await auditEntries()).map(({ action }) => action)).toEqual([
      'visit.writtenOff',
      'visit.writeOffUndone',
      'payment.voided',
    ]);
  });

  it('a void waiting while its visit is written off is VISIT_WRITTEN_OFF', async () => {
    const visit = await closed(2_000);
    const { id } = await pay({ visitId: visit.id }, 1_000);

    const response = await whileHeld(
      lockSpace,
      () => voidIt(owner, id),
      (tx) =>
        tx.visit.update({
          where: { id: visit.id },
          data: { writtenOffAt: NOW, writtenOffById: owner.id, writeOffReason: 'Left' },
        }),
    );
    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('VISIT_WRITTEN_OFF');
    expect(await storedVoid(id)).toEqual(NOT_VOIDED);
  });
});

describe('what a void changes', () => {
  it('a fixed subscription paid in full, its payment voided: the statement answers paid 0, its balance the price; the price may then be corrected below the old paid', async () => {
    const customer = await createCustomer(spaceId);
    const monthly = await createSubscription(customer, { billing: 'FIXED', priceAgorot: 30_000 });
    const { id } = await pay({ subscriptionId: monthly.id }, 30_000);
    const statement = async () => {
      const response = await get(`/subscriptions/${String(monthly.id)}`);
      expect(response.status).toBe(200);
      return dataOf(response) as { paidAgorot: number; balanceAgorot: number };
    };
    const correct = () =>
      request(app)
        .put(`/api/v1/manage/spaces/${String(spaceId)}/subscriptions/${String(monthly.id)}/price`)
        .set('Authorization', owner.authorization)
        .send({ billing: 'FIXED', priceAgorot: 20_000, reason: 'Agreed' });
    expect(await statement()).toMatchObject({ paidAgorot: 30_000, balanceAgorot: 0 });
    const belowPaid = await correct();
    expect(belowPaid.status).toBe(409);
    expect(errorOf(belowPaid).code).toBe('PRICE_BELOW_PAID');

    expect((await voidIt(owner, id)).status).toBe(200);
    expect(await statement()).toMatchObject({ paidAgorot: 0, balanceAgorot: 30_000 });
    expect((await correct()).status).toBe(200);
    expect(await statement()).toMatchObject({ paidAgorot: 0, balanceAgorot: 20_000 });
  });

  it("a visit with a customer, its payment voided, counts in the customer's debt and the file's unpaid visits; a usage-based subscription's credit shrinks by it", async () => {
    const customer = await createCustomer(spaceId);
    const visit = await closed(2_000, { customerId: customer.id });
    const visitPayment = await pay({ visitId: visit.id }, 2_000);
    const hourly = await createSubscription(customer, { billing: 'PER_HOUR', priceAgorot: 500 });
    const ahead = await pay({ subscriptionId: hourly.id }, 1_000);
    const file = async () => {
      const response = await get(`/customers/${String(customer.id)}`);
      expect(response.status).toBe(200);
      const { debtAgorot, creditAgorot, unpaidVisits } = dataOf(response) as {
        debtAgorot: number;
        creditAgorot: number;
        unpaidVisits: { visit: { id: number }; paidAgorot: number; balanceAgorot: number }[];
      };
      return {
        debtAgorot,
        creditAgorot,
        unpaid: unpaidVisits.map(({ visit: { id }, paidAgorot, balanceAgorot }) => ({
          id,
          paidAgorot,
          balanceAgorot,
        })),
      };
    };
    expect(await file()).toEqual({ debtAgorot: 0, creditAgorot: 1_000, unpaid: [] });

    expect((await voidIt(owner, visitPayment.id)).status).toBe(200);
    expect((await voidIt(owner, ahead.id)).status).toBe(200);
    expect(await file()).toEqual({
      debtAgorot: 2_000,
      creditAgorot: 0,
      unpaid: [{ id: visit.id, paidAgorot: 0, balanceAgorot: 2_000 }],
    });
  });

  it('voiding one of an item’s two payments leaves the other, the item and every other payment as they were', async () => {
    const customer = await createCustomer(spaceId);
    const visit = await closed(3_000, { customerId: customer.id });
    const other = await closed(1_000, { customerId: customer.id });
    const monthly = await createSubscription(customer, { billing: 'FIXED', priceAgorot: 30_000 });
    const voided = await pay({ visitId: visit.id }, 1_000);
    await pay({ visitId: visit.id }, 1_000);
    // A renewal's allocation of two parts: the other visit's debt, then the subscription.
    await pay({ visitId: other.id }, 1_000);
    await pay({ subscriptionId: monthly.id }, 5_000);
    const everything = async () => ({
      payments: await prisma.payment.findMany({ orderBy: { id: 'asc' } }),
      visits: await prisma.visit.findMany({ orderBy: { id: 'asc' } }),
      subscriptions: await prisma.subscription.findMany({ orderBy: { id: 'asc' } }),
    });
    const before = await everything();

    expect((await voidIt(owner, voided.id)).status).toBe(200);
    const after = await everything();
    expect(after).toEqual({
      ...before,
      payments: before.payments.map((payment) =>
        payment.id === voided.id
          ? { ...payment, voidedAt: NOW, voidedById: owner.id, voidReason: REASON }
          : payment,
      ),
    });
  });

  it("a retry of the payment's request after its void answers it, 201, records nothing, the sums showing the void", async () => {
    const customer = await createCustomer(spaceId);
    const visit = await closed(2_000, { customerId: customer.id });
    const key = randomUUID();
    const receive = () =>
      request(app)
        .post(`/api/v1/manage/spaces/${String(spaceId)}/payments`)
        .set('Authorization', reception.authorization)
        .set('Idempotency-Key', key)
        .send({ visitId: visit.id, amountAgorot: 1_000, method: 'CASH' });
    const first = await receive();
    expect(first.status).toBe(201);
    const { payment } = dataOf(first) as { payment: { id: number } };
    expect(dataOf(first)).toMatchObject({ paidAgorot: 1_000, balanceAgorot: 1_000 });

    expect((await voidIt(owner, payment.id)).status).toBe(200);
    const retry = await receive();
    expect(retry.status).toBe(201);
    expect(dataOf(retry)).toMatchObject({ payment, paidAgorot: 0, balanceAgorot: 2_000 });
    expect(await prisma.payment.count()).toBe(1);
  });
});

describe('two voids at once', () => {
  it('two voids at once void it once: the second answers the first’s reason', async () => {
    const visit = await closed(2_000);
    const { id } = await pay({ visitId: visit.id }, 2_000);

    const response = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM payments WHERE id = ${id} FOR UPDATE`,
      () => voidIt(owner, id, { reason: 'Wrong amount' }),
      (tx) =>
        tx.payment.update({
          where: { id },
          data: { voidedAt: RECEIVED, voidedById: owner.id, voidReason: REASON },
        }),
    );
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      voided: { at: '2026-10-23T09:00:00.000Z', reason: REASON },
    });
    expect(await storedVoid(id)).toEqual({
      voidedAt: RECEIVED,
      voidedById: owner.id,
      voidReason: REASON,
    });
    expect(await auditEntries()).toEqual([]);
  });
});
