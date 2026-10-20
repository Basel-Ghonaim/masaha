import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createCustomer, createSpace, createVisit } from '../../../test/factories.ts';
import { waitingOnLock, whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { addPrice, setWeek, signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

/** A time on Sunday 2026-10-18 in Gaza, UTC+3 until 2026-10-24. */
const sunday = (time: string) => new Date(`2026-10-18T${time}+03:00`);
/** The API with its clock at that time. */
const at = (time: string) => createTestApp({ clock: () => sunday(time) });
const app = at('10:20:00');

/** Open 08:00–18:00 every day. */
const EVERY_DAY = Array.from({ length: 7 }, () => [8 * 60, 18 * 60] as [number, number]);
const PHONE = '+970599000123';

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
      visitRounding: 'UP_AFTER_MINUTES',
      visitRoundingMinutes: 15,
      visitCapAtDayPrice: true,
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
  await addPrice(spaceId, 'HOUR', 500);
  await addPrice(spaceId, 'DAY', 2_500);
});

/** Checks a visitor in at 08:00, through the API; answers the visit's id. */
async function checkedIn(visitorName = 'Omar') {
  const response = await request(at('08:00:00'))
    .post(`/api/v1/manage/spaces/${String(spaceId)}/visits`)
    .set('Authorization', owner.authorization)
    .set('Idempotency-Key', randomUUID())
    .send({ visitorName });
  expect(response.status).toBe(201);
  return (dataOf(response) as { id: number }).id;
}

/** Checks the visit out as the caller, with this key, through `app` (10:20) unless told. */
function checkOut(
  caller: { authorization: string },
  visitId: number,
  body: object,
  key = randomUUID(),
  through = app,
) {
  return request(through)
    .post(`/api/v1/manage/spaces/${String(spaceId)}/visits/${String(visitId)}/check-out`)
    .set('Authorization', caller.authorization)
    .set('Idempotency-Key', key)
    .send(body);
}

const storedVisit = (id: number) => prisma.visit.findUniqueOrThrow({ where: { id } });
const storedPayments = () => prisma.payment.findMany({ orderBy: { id: 'asc' } });

/** The audit entries after the check-ins, by action. */
async function actionsAfterCheckIn() {
  return (await auditEntries())
    .map(({ action }) => action)
    .filter((action) => action !== 'visit.checkedIn');
}

/** The prices removed: a visit checked in then has no rate. */
async function withoutPrices() {
  await prisma.spacePrice.deleteMany({ where: { spaceId } });
}

describe('checking a visit out', () => {
  it('a check-out paid in full stores the charge with its rule and cap, records the payment, audits both', async () => {
    const visitId = await checkedIn();
    // 2 h 20 min at 5 ₪ an hour, up after 15 minutes: 3 hours, 15 ₪.
    const response = await checkOut(reception, visitId, {
      payment: { amountAgorot: 1_500, method: 'CASH' },
    });

    expect(response.status).toBe(200);
    const { payment } = dataOf(response) as { payment: { id: number } };
    expect(dataOf(response)).toEqual({
      visit: {
        id: visitId,
        visitorName: 'Omar',
        customer: null,
        audience: 'GENERAL',
        shiftId: null,
        hourRateAgorot: 500,
        dayRateAgorot: 2_500,
        checkedInAt: '2026-10-18T05:00:00.000Z',
        checkedOutAt: '2026-10-18T07:20:00.000Z',
        checkoutMethod: 'MANUAL',
        charge: {
          amountAgorot: 1_500,
          roundingRule: 'UP_AFTER_MINUTES',
          roundingMinutes: 15,
          capApplied: false,
          typedById: null,
          reason: null,
        },
      },
      payment: {
        id: payment.id,
        amountAgorot: 1_500,
        method: 'CASH',
        note: null,
        receivedAt: '2026-10-18T07:20:00.000Z',
        recordedById: reception.id,
      },
    });
    expect((await auditEntries()).slice(1)).toEqual([
      {
        actorId: reception.id,
        action: 'visit.checkedOut',
        entityType: 'visit',
        entityId: visitId,
        spaceId,
        before: null,
        after: {
          checkedOutAt: '2026-10-18T07:20:00.000Z',
          requestedAt: '2026-10-18T07:20:00.000Z',
          chargeAgorot: 1_500,
          capApplied: false,
          typedById: null,
          reason: null,
          customerId: null,
        },
      },
      {
        actorId: reception.id,
        action: 'payment.recorded',
        entityType: 'payment',
        entityId: payment.id,
        spaceId,
        before: null,
        after: { visitId, amountAgorot: 1_500, method: 'CASH' },
      },
    ]);
  });

  it('the rates are those copied at check-in, the rounding and the cap those in force at check-out', async () => {
    const visitId = await checkedIn();
    await prisma.spacePrice.updateMany({
      where: { spaceId, period: 'HOUR' },
      data: { amountAgorot: 900 },
    });
    await prisma.spaceSettings.update({
      where: { spaceId },
      data: { visitRounding: 'PER_MINUTE', visitRoundingMinutes: null, visitCapAtDayPrice: false },
    });

    // 140 minutes at 5 ₪ an hour, per minute: 11.666… ₪, rounded half up.
    const response = await checkOut(owner, visitId, {
      payment: { amountAgorot: 1_167, method: 'TRANSFER' },
    });
    expect(response.status).toBe(200);
    expect((dataOf(response) as { visit: object }).visit).toMatchObject({
      charge: {
        amountAgorot: 1_167,
        roundingRule: 'PER_MINUTE',
        roundingMinutes: null,
        capApplied: false,
      },
    });
  });

  it('a part left unpaid needs a phone: 422 required, writing nothing', async () => {
    const visitId = await checkedIn();

    for (const body of [{ payment: { amountAgorot: 1_000, method: 'CASH' } }, {}]) {
      const response = await checkOut(owner, visitId, body);
      expect(response.status).toBe(422);
      expect(errorOf(response).errors).toEqual({ phone: ['required'] });
    }
    expect(await storedVisit(visitId)).toMatchObject({ checkedOutAt: null, chargeAgorot: null });
    expect(await storedPayments()).toEqual([]);
    expect(await actionsAfterCheckIn()).toEqual([]);
  });

  it("with a phone, the rest is the debt of the customer with that phone, created with the visit's name when new, audited customer.created", async () => {
    const omar = await checkedIn('Omar');
    const first = await checkOut(owner, omar, {
      payment: { amountAgorot: 1_000, method: 'CASH' },
      phone: '059-900-0123',
    });
    expect(first.status).toBe(200);
    const { customer } = (dataOf(first) as { visit: { customer: { id: number } } }).visit;
    expect(customer).toEqual({ id: customer.id, name: 'Omar', phone: PHONE });
    expect(await storedVisit(omar)).toMatchObject({ customerId: customer.id });

    // The same phone again: the same customer, its name kept.
    const layla = await checkedIn('Layla');
    const second = await checkOut(reception, layla, { phone: PHONE, customerName: 'Layla' });
    expect(second.status).toBe(200);
    expect((dataOf(second) as { visit: { customer: unknown } }).visit.customer).toEqual({
      id: customer.id,
      name: 'Omar',
      phone: PHONE,
    });
    expect(await prisma.customer.count()).toBe(1);

    const created = (await auditEntries()).filter(({ action }) => action === 'customer.created');
    expect(created).toEqual([
      {
        actorId: owner.id,
        action: 'customer.created',
        entityType: 'customer',
        entityId: customer.id,
        spaceId,
        before: null,
        after: { name: 'Omar', phone: PHONE },
      },
    ]);
  });

  it("an archived customer's phone makes a new customer", async () => {
    const archived = await createCustomer(spaceId, {
      name: 'Old',
      phone: PHONE,
      archivedAt: sunday('07:00:00'),
    });
    const visitId = await checkedIn();

    const response = await checkOut(owner, visitId, { phone: PHONE, customerName: 'Omar Saleh' });
    expect(response.status).toBe(200);
    const { customer } = (dataOf(response) as { visit: { customer: { id: number } } }).visit;
    expect(customer.id).not.toBe(archived.id);
    expect(customer).toMatchObject({ name: 'Omar Saleh', phone: PHONE });
  });

  it('an amount above the charge is refused by the ledger: 409 PAYMENT_EXCEEDS_DUE, writing nothing', async () => {
    const visitId = await checkedIn();

    const response = await checkOut(owner, visitId, {
      payment: { amountAgorot: 1_501, method: 'CASH' },
    });
    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('PAYMENT_EXCEEDS_DUE');
    expect(await storedVisit(visitId)).toMatchObject({ checkedOutAt: null, chargeAgorot: null });
    expect(await storedPayments()).toEqual([]);
    expect(await actionsAfterCheckIn()).toEqual([]);
  });

  it('a retry with the same key answers the first result: the same visit and payment, one payment', async () => {
    const visitId = await checkedIn();
    const key = randomUUID();
    const body = { payment: { amountAgorot: 1_500, method: 'CASH' } };

    const first = await checkOut(reception, visitId, body, key);
    const retry = await checkOut(reception, visitId, body, key, at('10:22:00'));
    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(dataOf(retry)).toEqual(dataOf(first));
    expect(await storedPayments()).toHaveLength(1);
  });

  it('a check-out of a visit already closed answers it closed and records no payment', async () => {
    const visitId = await checkedIn();
    const body = { payment: { amountAgorot: 1_500, method: 'CASH' } };
    const first = await checkOut(owner, visitId, body);

    const again = await checkOut(reception, visitId, body, randomUUID(), at('10:40:00'));
    expect(again.status).toBe(200);
    expect(dataOf(again)).toEqual({
      visit: (dataOf(first) as { visit: unknown }).visit,
      payment: null,
    });
    expect(await storedPayments()).toHaveLength(1);
  });

  it('two check-outs of one visit at once record one payment', async () => {
    const visitId = await checkedIn();
    const body = { payment: { amountAgorot: 1_500, method: 'CASH' } };
    const pending: Promise<request.Response>[] = [];
    // Both wait on the space's lock; the second finds the visit closed.
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;
      pending.push(
        Promise.resolve(checkOut(owner, visitId, body)),
        Promise.resolve(checkOut(reception, visitId, body)),
      );
      await waitingOnLock({ count: 2 });
    });

    const answers = await Promise.all(pending);
    expect(answers.map(({ status }) => status)).toEqual([200, 200]);
    const payments = answers.map((answer) => (dataOf(answer) as { payment: unknown }).payment);
    expect(payments.filter((payment) => payment !== null)).toHaveLength(1);
    expect(await storedPayments()).toHaveLength(1);
  });

  it("the quote's time prices the stay; a time older than 5 minutes or in the future is refused (422 out_of_range)", async () => {
    const visitId = await checkedIn();

    for (const checkedOutAt of ['2026-10-18T10:14:59+03:00', '2026-10-18T10:20:01+03:00']) {
      const response = await checkOut(owner, visitId, { checkedOutAt, phone: PHONE });
      expect(response.status).toBe(422);
      expect(errorOf(response).errors).toEqual({ checkedOutAt: ['out_of_range'] });
    }
    expect(await storedVisit(visitId)).toMatchObject({ checkedOutAt: null });

    // Quoted at 10:15, five minutes ago: 2 h 15 min, up after 15 minutes, is 2 hours.
    const response = await checkOut(owner, visitId, {
      checkedOutAt: '2026-10-18T10:15:00+03:00',
      payment: { amountAgorot: 1_000, method: 'CASH' },
    });
    expect(response.status).toBe(200);
    expect((dataOf(response) as { visit: object }).visit).toMatchObject({
      checkedOutAt: '2026-10-18T07:15:00.000Z',
      charge: { amountAgorot: 1_000 },
    });
    const [, checkedOut] = await auditEntries();
    expect(checkedOut?.after).toMatchObject({
      checkedOutAt: '2026-10-18T07:15:00.000Z',
      requestedAt: '2026-10-18T07:20:00.000Z',
    });
  });

  it('a visit with no rate: the owner types its charge with a reason, recorded with who typed it', async () => {
    await withoutPrices();
    const visitId = await checkedIn();

    const response = await checkOut(owner, visitId, {
      charge: { amountAgorot: 2_000, reason: 'No evening price' },
      payment: { amountAgorot: 2_000, method: 'CASH' },
    });
    expect(response.status).toBe(200);
    expect((dataOf(response) as { visit: object }).visit).toMatchObject({
      charge: {
        amountAgorot: 2_000,
        roundingRule: null,
        roundingMinutes: null,
        capApplied: null,
        typedById: owner.id,
        reason: 'No evening price',
      },
    });
    expect(await storedVisit(visitId)).toMatchObject({
      chargeAgorot: 2_000,
      chargeSetById: owner.id,
      chargeReason: 'No evening price',
    });
  });

  it('reception types a charge only where the space allows it: 403 PRICE_TYPING_NOT_ALLOWED otherwise, writing nothing', async () => {
    await withoutPrices();
    const visitId = await checkedIn();
    const body = {
      charge: { amountAgorot: 2_000, reason: 'No evening price' },
      payment: { amountAgorot: 2_000, method: 'CASH' },
    };

    const refused = await checkOut(reception, visitId, body);
    expect(refused.status).toBe(403);
    expect(errorOf(refused).code).toBe('PRICE_TYPING_NOT_ALLOWED');
    expect(await storedVisit(visitId)).toMatchObject({ checkedOutAt: null });
    expect(await storedPayments()).toEqual([]);

    await prisma.spaceSettings.update({
      where: { spaceId },
      data: { receptionMayTypePrices: true },
    });
    const allowed = await checkOut(reception, visitId, body);
    expect(allowed.status).toBe(200);
    expect(await storedVisit(visitId)).toMatchObject({ chargeSetById: reception.id });
  });

  it('a typed charge needs a reason (422 required) and is refused where the visit has a rate (422 invalid_choice on charge)', async () => {
    const visitId = await checkedIn();

    const noReason = await checkOut(owner, visitId, { charge: { amountAgorot: 2_000 } });
    expect(noReason.status).toBe(422);
    expect(errorOf(noReason).errors).toEqual({ 'charge.reason': ['required'] });

    const withRate = await checkOut(owner, visitId, {
      charge: { amountAgorot: 2_000, reason: 'A round sum' },
      phone: PHONE,
    });
    expect(withRate.status).toBe(422);
    expect(errorOf(withRate).errors).toEqual({ charge: ['invalid_choice'] });
    expect(await storedVisit(visitId)).toMatchObject({ checkedOutAt: null });
  });

  it('refuses a stranger, an owner of another space and the admin with not_found; a visit of another space is not_found', async () => {
    const visitId = await checkedIn();
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await checkOut(caller, visitId, { phone: PHONE });
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }

    const theirs = await createVisit(otherSpaceId, { checkedInAt: sunday('08:00:00') });
    const response = await checkOut(owner, theirs.id, { phone: PHONE });
    expect(response.status).toBe(404);
    expect(await storedVisit(theirs.id)).toMatchObject({ checkedOutAt: null });
    expect(await storedVisit(visitId)).toMatchObject({ checkedOutAt: null });
  });

  it("a reception link deactivated while the check-out waits on the space's lock refuses it with 403", async () => {
    const visitId = await checkedIn();
    const response = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`,
      () => checkOut(reception, visitId, { payment: { amountAgorot: 1_500, method: 'CASH' } }),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: reception.id } },
          data: { deactivatedAt: new Date() },
        }),
    );

    expect(response.status).toBe(403);
    expect(errorOf(response).type).toBe('forbidden');
    expect(await storedVisit(visitId)).toMatchObject({ checkedOutAt: null });
  });
});

describe('a visit with no rate, checked out by whoever may not type a price', () => {
  it('reception without the switch closes a visit with no rate unpriced, with a phone; never free', async () => {
    await withoutPrices();
    const visitId = await checkedIn();

    const response = await checkOut(reception, visitId, { phone: PHONE });
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      visit: {
        checkedOutAt: '2026-10-18T07:20:00.000Z',
        checkoutMethod: 'MANUAL',
        charge: null,
        customer: { name: 'Omar', phone: PHONE },
      },
      payment: null,
    });
    expect(await storedVisit(visitId)).toMatchObject({
      checkoutMethod: 'MANUAL',
      chargeAgorot: null,
      chargeSetById: null,
    });
  });

  it('the unpriced close still needs a phone (422 required)', async () => {
    await withoutPrices();
    const visitId = await checkedIn();

    const response = await checkOut(reception, visitId, {});
    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ phone: ['required'] });
    expect(await storedVisit(visitId)).toMatchObject({ checkedOutAt: null });
  });

  it('the owner, who may type, must: 422 required on charge', async () => {
    await withoutPrices();
    const visitId = await checkedIn();

    for (const caller of [owner, reception]) {
      if (caller === reception) {
        await prisma.spaceSettings.update({
          where: { spaceId },
          data: { receptionMayTypePrices: true },
        });
      }
      const response = await checkOut(caller, visitId, { phone: PHONE });
      expect(response.status).toBe(422);
      expect(errorOf(response).errors).toEqual({ charge: ['required'] });
    }
    expect(await storedVisit(visitId)).toMatchObject({ checkedOutAt: null });
  });

  it('a payment on an unpriced close is refused by the ledger: 409 VISIT_NOT_PRICED', async () => {
    await withoutPrices();
    const visitId = await checkedIn();

    const response = await checkOut(reception, visitId, {
      phone: PHONE,
      payment: { amountAgorot: 500, method: 'CASH' },
    });
    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('VISIT_NOT_PRICED');
    expect(await storedVisit(visitId)).toMatchObject({ checkedOutAt: null });
    expect(await prisma.customer.count()).toBe(0);
    expect(await storedPayments()).toEqual([]);
  });
});
