import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createCustomer, createSpace, createVisit, stay } from '../../../test/factories.ts';
import { whileHeld } from '../../../test/locks.ts';
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
function closed(chargeAgorot: number | null, space = spaceId) {
  return createVisit(space, {
    ...stay('2026-10-17', '09:00', '18:00'),
    checkoutMethod: 'AUTO',
    chargeAgorot,
  });
}

/** Leaves the visit's debt to the phone's customer, as the caller. */
function leaveTo(caller: { authorization: string }, visitId: number, body: object) {
  return request(app)
    .put(`/api/v1/manage/spaces/${String(spaceId)}/visits/${String(visitId)}/customer`)
    .set('Authorization', caller.authorization)
    .send(body);
}

async function uncollected() {
  const response = await request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/uncollected-visits`)
    .set('Authorization', owner.authorization);
  return (dataOf(response) as { visit: { id: number; customer: unknown } }[]).map(
    ({ visit }) => visit,
  );
}

const storedVisit = (id: number) => prisma.visit.findUniqueOrThrow({ where: { id } });
const lockSpace = (tx: Pick<typeof prisma, '$queryRaw'>) =>
  tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;

describe("«تسجيل دينًا»: a visit's debt left to a customer by phone", () => {
  it("the staff record an uncollected visit as the debt of the phone's customer, found or created; it stays uncollected, with its customer; audited visit.leftToCustomer", async () => {
    const { id } = await closed(2_500);

    const response = await leaveTo(reception, id, { phone: '059-900-0123' });
    expect(response.status).toBe(200);
    const customer = await prisma.customer.findFirstOrThrow();
    expect(customer).toMatchObject({ name: 'Omar', phone: PHONE });
    expect(dataOf(response)).toMatchObject({
      id,
      customer: { id: customer.id, name: 'Omar', phone: PHONE },
    });
    expect(await storedVisit(id)).toMatchObject({ customerId: customer.id });
    expect(await uncollected()).toMatchObject([{ id, customer: { id: customer.id } }]);
    expect(await auditEntries()).toEqual([
      {
        actorId: reception.id,
        action: 'customer.created',
        entityType: 'customer',
        entityId: customer.id,
        spaceId,
        before: null,
        after: { name: 'Omar', phone: PHONE },
      },
      {
        actorId: reception.id,
        action: 'visit.leftToCustomer',
        entityType: 'visit',
        entityId: id,
        spaceId,
        before: null,
        after: { customerId: customer.id },
      },
    ]);

    // Another visit, the same phone: the customer found, not created again.
    const other = await closed(1_000);
    const found = await leaveTo(owner, other.id, { phone: PHONE, customerName: 'Rami' });
    expect(found.status).toBe(200);
    expect(dataOf(found)).toMatchObject({ customer: { id: customer.id, name: 'Omar' } });
    expect(await prisma.customer.count()).toBe(1);
  });

  it('an unpriced visit can be recorded as a debt', async () => {
    const { id } = await closed(null);

    const response = await leaveTo(reception, id, { phone: PHONE, customerName: 'Huda' });
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({ charge: null, customer: { name: 'Huda' } });
  });

  it('the same phone again answers the visit as it is, writing nothing; another phone is refused 409 VISIT_HAS_CUSTOMER', async () => {
    const { id } = await closed(2_500);
    const first = await leaveTo(reception, id, { phone: PHONE });
    const audited = await auditEntries();

    const again = await leaveTo(reception, id, { phone: PHONE });
    expect(again.status).toBe(200);
    expect(dataOf(again)).toEqual(dataOf(first));
    expect(await auditEntries()).toEqual(audited);

    const another = await leaveTo(reception, id, { phone: OTHER_PHONE });
    expect(another.status).toBe(409);
    expect(errorOf(another).code).toBe('VISIT_HAS_CUSTOMER');
    expect(await prisma.customer.count()).toBe(1);
    expect(await auditEntries()).toEqual(audited);
  });

  it('refuses a written-off visit VISIT_WRITTEN_OFF, a paid one VISIT_ALREADY_PAID, an open one 409, writing nothing', async () => {
    const writtenOff = await closed(2_500);
    await prisma.visit.update({
      where: { id: writtenOff.id },
      data: { writtenOffAt: new Date(), writtenOffById: owner.id, writeOffReason: 'Left' },
    });
    const settled = await closed(2_000);
    await prisma.payment.create({
      data: {
        spaceId,
        visitId: settled.id,
        idempotencyKey: randomUUID(),
        recordedById: owner.id,
        method: 'CASH',
        amountAgorot: 2_000,
      },
    });
    const open = await createVisit(spaceId, {
      checkedInAt: new Date('2026-10-18T09:00:00+03:00'),
    });

    const refusedOff = await leaveTo(reception, writtenOff.id, { phone: PHONE });
    expect(refusedOff.status).toBe(409);
    expect(errorOf(refusedOff).code).toBe('VISIT_WRITTEN_OFF');
    const refusedPaid = await leaveTo(reception, settled.id, { phone: PHONE });
    expect(refusedPaid.status).toBe(409);
    expect(errorOf(refusedPaid).code).toBe('VISIT_ALREADY_PAID');
    const refusedOpen = await leaveTo(reception, open.id, { phone: PHONE });
    expect(refusedOpen.status).toBe(409);
    expect(errorOf(refusedOpen).code).toBeUndefined();

    for (const { id } of [writtenOff, settled, open]) {
      expect(await storedVisit(id)).toMatchObject({ customerId: null });
    }
    expect(await prisma.customer.count()).toBe(0);
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses a missing or malformed phone with 422 before anything is read', async () => {
    const { id } = await closed(2_500);

    const missing = await leaveTo(reception, id, {});
    expect(missing.status).toBe(422);
    expect(errorOf(missing).errors).toEqual({ phone: ['required'] });
    const malformed = await leaveTo(reception, id, { phone: '12345' });
    expect(malformed.status).toBe(422);
    expect(errorOf(malformed).errors).toEqual({ phone: ['invalid_format'] });
    expect(await storedVisit(id)).toMatchObject({ customerId: null });
  });

  it('answers the owner and reception; not_found to the three others; a reception link ended meanwhile → 403', async () => {
    for (const caller of [owner, reception]) {
      const { id } = await closed(2_500);
      expect((await leaveTo(caller, id, { phone: PHONE })).status).toBe(200);
    }
    const { id } = await closed(2_500);
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await leaveTo(caller, id, { phone: PHONE });
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    const theirs = await closed(2_500, otherSpaceId);
    expect((await leaveTo(owner, theirs.id, { phone: PHONE })).status).toBe(404);

    const ended = await whileHeld(
      lockSpace,
      () => leaveTo(reception, id, { phone: PHONE }),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: reception.id } },
          data: { deactivatedAt: new Date() },
        }),
    );
    expect(ended.status).toBe(403);
    expect(await storedVisit(id)).toMatchObject({ customerId: null });
    expect(await storedVisit(theirs.id)).toMatchObject({ customerId: null });
  });

  it('two desks recording two phones at once: the second is refused VISIT_HAS_CUSTOMER', async () => {
    const { id } = await closed(2_500);
    const huda = await createCustomer(spaceId, { name: 'Huda', phone: OTHER_PHONE });

    const response = await whileHeld(
      lockSpace,
      () => leaveTo(reception, id, { phone: PHONE }),
      (tx) => tx.visit.update({ where: { id }, data: { customerId: huda.id } }),
    );
    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('VISIT_HAS_CUSTOMER');
    expect(await storedVisit(id)).toMatchObject({ customerId: huda.id });
    expect(await prisma.customer.count()).toBe(1);
  });
});
