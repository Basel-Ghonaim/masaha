import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import type { Prisma } from '../generated/prisma/client.ts';
import {
  createCustomer,
  createSpace,
  createSubscription,
  createUser,
  createVisit,
  stay,
} from '../../test/factories.ts';
import { resetDatabase } from '../../test/reset-database.ts';
import { prisma } from './prisma.ts';

// The payment ledger of ADR 0010, as the database enforces it (docs/architecture/data-model.md ›
// Constraints worth stating): one item per payment, append-only, voided once with a reason, and
// never more than the due except on a usage-based subscription.

beforeEach(async () => {
  await resetDatabase(prisma);
});

async function setup() {
  const space = await createSpace();
  const staff = await createUser();
  const owner = await createUser('owner@example.com');
  // Closed after 2 h 50 min at 5 ₪ an hour, rounded up to 3 h: a 15 ₪ charge.
  const visit = await createVisit(space.id, {
    ...stay('2026-10-01', '08:00', '10:50'),
    hourRateAgorot: 500,
    roundingRule: 'UP_AFTER_MINUTES',
    roundingMinutes: 15,
    capApplied: false,
    chargeAgorot: 1_500,
  });
  const customer = await createCustomer(space.id);
  const monthly = await createSubscription(customer, { billing: 'FIXED', priceAgorot: 30_000 });
  const hourly = await createSubscription(customer, { billing: 'PER_HOUR', priceAgorot: 500 });
  return { space, staff, owner, visit, monthly, hourly };
}

type Item = { visitId: number } | { subscriptionId: number };

function pay(
  spaceId: number,
  recordedById: number,
  item: Item | Record<string, number>,
  amountAgorot: number,
  data: Partial<Prisma.PaymentUncheckedCreateInput> = {},
) {
  return prisma.payment.create({
    data: {
      spaceId,
      requestId: randomUUID(),
      recordedById,
      method: 'CASH',
      amountAgorot,
      ...item,
      ...data,
    },
  });
}

describe('a payment', () => {
  it('settles exactly one item', async () => {
    const { space, staff, visit, monthly } = await setup();

    await expect(pay(space.id, staff.id, {}, 500)).rejects.toThrow(/payments_one_item_check/);
    await expect(
      pay(space.id, staff.id, { visitId: visit.id, subscriptionId: monthly.id }, 500),
    ).rejects.toThrow(/payments_one_item_check/);
  });

  it('has a positive amount', async () => {
    const { space, staff, visit } = await setup();

    await expect(pay(space.id, staff.id, { visitId: visit.id }, 0)).rejects.toThrow(
      /payments_amount_check/,
    );
    await expect(pay(space.id, staff.id, { visitId: visit.id }, -500)).rejects.toThrow(
      /payments_amount_check/,
    );
  });

  it('settles only an item of its own space', async () => {
    const { staff, visit } = await setup();
    const other = await createSpace('branch-hub');

    await expect(pay(other.id, staff.id, { visitId: visit.id }, 500)).rejects.toMatchObject({
      code: 'P2003',
    });
  });
});

describe('the ledger', () => {
  it('never updates a payment', async () => {
    const { space, staff, visit } = await setup();
    const payment = await pay(space.id, staff.id, { visitId: visit.id }, 1_000);

    await expect(
      prisma.payment.update({ where: { id: payment.id }, data: { amountAgorot: 500 } }),
    ).rejects.toThrow(/payments_append_only/);
    await expect(
      prisma.payment.update({ where: { id: payment.id }, data: { note: 'corrected' } }),
    ).rejects.toThrow(/payments_append_only/);
  });

  it('never deletes a payment', async () => {
    const { space, staff, visit } = await setup();
    const payment = await pay(space.id, staff.id, { visitId: visit.id }, 1_000);

    await expect(prisma.payment.delete({ where: { id: payment.id } })).rejects.toThrow(
      /payments_append_only/,
    );
    expect(await prisma.payment.count()).toBe(1);
  });

  it('voids a payment once, with who, when and a reason', async () => {
    const { space, staff, owner, visit } = await setup();
    const payment = await pay(space.id, staff.id, { visitId: visit.id }, 1_000);
    const where = { id: payment.id };

    await expect(
      prisma.payment.update({
        where,
        data: { voidedAt: new Date(), voidedById: owner.id, voidReason: 'Recorded twice' },
      }),
    ).resolves.toMatchObject({ voidedById: owner.id, amountAgorot: 1_000 });
    await expect(
      prisma.payment.update({
        where,
        data: { voidedAt: new Date(), voidedById: owner.id, voidReason: 'Again' },
      }),
    ).rejects.toThrow(/payments_void_once/);
    await expect(
      prisma.payment.update({
        where,
        data: { voidedAt: null, voidedById: null, voidReason: null },
      }),
    ).rejects.toThrow(/payments_void_once/);
  });

  it('requires a reason to void, and changes nothing else in the void', async () => {
    const { space, staff, owner, visit } = await setup();
    const { id } = await pay(space.id, staff.id, { visitId: visit.id }, 1_000);
    const voided = { voidedAt: new Date(), voidedById: owner.id };

    await expect(prisma.payment.update({ where: { id }, data: voided })).rejects.toThrow(
      /payments_void_check/,
    );
    await expect(
      prisma.payment.update({ where: { id }, data: { ...voided, voidReason: '  ' } }),
    ).rejects.toThrow(/payments_void_check/);
    await expect(
      prisma.payment.update({
        where: { id },
        data: { ...voided, voidReason: 'Wrong amount', amountAgorot: 500 },
      }),
    ).rejects.toThrow(/payments_append_only/);
  });

  it('never records a payment already voided', async () => {
    const { space, staff, owner, visit } = await setup();

    await expect(
      pay(space.id, staff.id, { visitId: visit.id }, 1_000, {
        voidedAt: new Date(),
        voidedById: owner.id,
        voidReason: 'Test',
      }),
    ).rejects.toThrow(/payments_void_once/);
  });
});

describe('the due', () => {
  it("is a visit's charge, paid in parts up to it and never beyond", async () => {
    const { space, staff, visit } = await setup();
    const item = { visitId: visit.id };
    await pay(space.id, staff.id, item, 1_000);

    await expect(pay(space.id, staff.id, item, 600)).rejects.toThrow(/payments_within_due/);
    await expect(pay(space.id, staff.id, item, 500)).resolves.toBeDefined();
  });

  it('waits for the visit to be charged', async () => {
    const { space, staff } = await setup();
    const open = await createVisit(space.id, { visitorName: 'Rami' });

    await expect(pay(space.id, staff.id, { visitId: open.id }, 500)).rejects.toThrow(
      /payments_within_due/,
    );
  });

  it("is a fixed subscription's price, never exceeded", async () => {
    const { space, staff, monthly } = await setup();
    const item = { subscriptionId: monthly.id };
    await pay(space.id, staff.id, item, 20_000);

    await expect(pay(space.id, staff.id, item, 15_000)).rejects.toThrow(/payments_within_due/);
    await expect(pay(space.id, staff.id, item, 10_000)).resolves.toBeDefined();
  });

  it('leaves out voided payments', async () => {
    const { space, staff, owner, monthly } = await setup();
    const item = { subscriptionId: monthly.id };
    const wrong = await pay(space.id, staff.id, item, 30_000);
    await prisma.payment.update({
      where: { id: wrong.id },
      data: { voidedAt: new Date(), voidedById: owner.id, voidReason: 'Wrong customer' },
    });

    await expect(pay(space.id, staff.id, item, 30_000)).resolves.toBeDefined();
  });

  it('has no ceiling on a usage-based subscription, which holds credit', async () => {
    const { space, staff, hourly } = await setup();
    const item = { subscriptionId: hourly.id };

    // Nothing attended yet: 100 ₪ paid ahead is credit («له رصيد»).
    await expect(pay(space.id, staff.id, item, 10_000)).resolves.toBeDefined();
    await expect(pay(space.id, staff.id, item, 5_000)).resolves.toBeDefined();
  });
});

describe('the request id', () => {
  it('records a retried payment once', async () => {
    const { space, staff, visit } = await setup();
    const requestId = randomUUID();
    const first = await pay(space.id, staff.id, { visitId: visit.id }, 500, { requestId });

    await expect(
      pay(space.id, staff.id, { visitId: visit.id }, 500, { requestId }),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(await prisma.payment.count()).toBe(1);
    await expect(
      prisma.payment.findUnique({ where: { spaceId_requestId: { spaceId: space.id, requestId } } }),
    ).resolves.toMatchObject({ id: first.id });
  });

  it('reports a retry as a retry, even when the first payment settled the item', async () => {
    const { space, staff, visit } = await setup();
    const requestId = randomUUID();
    await pay(space.id, staff.id, { visitId: visit.id }, 1_500, { requestId });

    await expect(
      pay(space.id, staff.id, { visitId: visit.id }, 1_500, { requestId }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
