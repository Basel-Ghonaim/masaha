import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  createCheckIn,
  createCustomer,
  createSpace,
  createSubscription,
  createUser,
  createVisit,
  stay,
} from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../../db/index.ts';
import { createPaymentsRepository } from './payments.repository.ts';

// The ledger's balances computed in the database (docs/architecture/data-model.md › Customer debt;
// the owner's decision 6): the one aggregate query of `payments`, run here against the real
// database, as of Wednesday 2026-10-21.

const repository = createPaymentsRepository();
const NOW = { today: '2026-10-21', weekStart: '2026-10-17' };

let spaceId: number;
let recorderId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  ({ id: recorderId } = await createUser());
});

/** A payment on one item of the space. */
function pay(
  item: { visitId: number } | { subscriptionId: number },
  amountAgorot: number,
  space = spaceId,
) {
  return prisma.payment.create({
    data: {
      spaceId: space,
      ...item,
      idempotencyKey: randomUUID(),
      recordedById: recorderId,
      method: 'CASH',
      amountAgorot,
    },
  });
}

/** A visit of the space closed on 2026-10-20, of this customer, with this charge (or none). */
function closedVisit(customerId: number, chargeAgorot: number | null, space = spaceId) {
  return createVisit(space, { ...stay('2026-10-20', '09:00', '12:00'), customerId, chargeAgorot });
}

describe('the customers’ balances', () => {
  it('a debt is the sum of positive balances: a fixed subscription partly paid, a per-hour one by its minutes, an unpaid visit', async () => {
    const customer = await createCustomer(spaceId);
    const fixed = await createSubscription(customer, { billing: 'FIXED', priceAgorot: 30_000 });
    await pay({ subscriptionId: fixed.id }, 10_000);
    // 90 minutes at 6 ₪ an hour: 900 agorot due.
    const perHour = await createSubscription(customer, { billing: 'PER_HOUR', priceAgorot: 600 });
    await createCheckIn(perHour, stay('2026-10-19', '10:00', '11:30'));
    const visit = await closedVisit(customer.id, 1_500);
    await pay({ visitId: visit.id }, 500);
    // A per-day subscription paid ahead: 2,500 in credit, which offsets nothing.
    const perDay = await createSubscription(customer, { billing: 'PER_DAY', priceAgorot: 2_500 });
    await createCheckIn(perDay, stay('2026-10-18', '10:00', '11:00'));
    await pay({ subscriptionId: perDay.id }, 5_000);

    expect(await repository.customerBalances(spaceId, [customer.id], NOW)).toEqual(
      new Map([[customer.id, { debtAgorot: 20_000 + 900 + 1_000, creditAgorot: 2_500 }]]),
    );
  });

  it('credit is only a usage-based subscription’s; a fixed one paid in full is settled', async () => {
    const customer = await createCustomer(spaceId);
    const fixed = await createSubscription(customer, { billing: 'FIXED', priceAgorot: 30_000 });
    await pay({ subscriptionId: fixed.id }, 30_000);
    const settled = await createCustomer(spaceId, { name: 'Settled' });
    const paidInFull = await createSubscription(settled, { priceAgorot: 20_000 });
    await pay({ subscriptionId: paidInFull.id }, 20_000);
    // Its price lowered under what was paid, directly (the price's guard is the next PR's): a
    // fixed price still holds no credit.
    await prisma.subscription.update({ where: { id: fixed.id }, data: { priceAgorot: 20_000 } });

    expect(await repository.customerBalances(spaceId, [customer.id, settled.id], NOW)).toEqual(
      new Map([
        [customer.id, { debtAgorot: 0, creditAgorot: 0 }],
        [settled.id, { debtAgorot: 0, creditAgorot: 0 }],
      ]),
    );
  });

  it('a voided payment counts for nothing, on a visit or a subscription; a written-off visit is no debt; an unpriced visit is no debt', async () => {
    const customer = await createCustomer(spaceId);
    const voided = await closedVisit(customer.id, 2_000);
    const subscription = await createSubscription(customer, { priceAgorot: 30_000 });
    const paid: [{ visitId: number } | { subscriptionId: number }, number][] = [
      [{ visitId: voided.id }, 2_000],
      [{ subscriptionId: subscription.id }, 30_000],
    ];
    for (const [item, amountAgorot] of paid) {
      const payment = await pay(item, amountAgorot);
      await prisma.payment.update({
        where: { id: payment.id },
        data: { voidedAt: new Date(), voidedById: recorderId, voidReason: 'Counted twice' },
      });
    }
    const writtenOff = await closedVisit(customer.id, 3_000);
    await prisma.visit.update({
      where: { id: writtenOff.id },
      data: { writtenOffAt: new Date(), writtenOffById: recorderId, writeOffReason: 'Gone' },
    });
    await closedVisit(customer.id, null);
    // Still open: no debt until it is closed.
    await createVisit(spaceId, {
      checkedInAt: new Date('2026-10-21T09:00:00+03:00'),
      customerId: customer.id,
    });

    expect(await repository.customerBalances(spaceId, [customer.id], NOW)).toEqual(
      new Map([[customer.id, { debtAgorot: 2_000 + 30_000, creditAgorot: 0 }]]),
    );
  });

  it('the payment filter’s ids: those who owe, those in credit; another space’s customers never', async () => {
    const owes = await createCustomer(spaceId, { name: 'Owes' });
    await closedVisit(owes.id, 1_500);
    const credit = await createCustomer(spaceId, { name: 'Credit' });
    const perDay = await createSubscription(credit, { billing: 'PER_DAY', priceAgorot: 2_500 });
    await pay({ subscriptionId: perDay.id }, 1_000);
    const settled = await createCustomer(spaceId, { name: 'Settled' });
    await pay({ visitId: (await closedVisit(settled.id, 1_000)).id }, 1_000);
    const { id: otherSpaceId } = await createSpace('other-space');
    const theirs = await createCustomer(otherSpaceId);
    await closedVisit(theirs.id, 1_500, otherSpaceId);

    expect(await repository.customerIdsByPayment(spaceId, 'OWES', NOW)).toEqual([owes.id]);
    expect(await repository.customerIdsByPayment(spaceId, 'CREDIT', NOW)).toEqual([credit.id]);
  });

  it('itemBalances lists a customer’s items oldest first, a visit before a subscription made at the same instant', async () => {
    const customer = await createCustomer(spaceId);
    const instant = new Date('2026-10-10T10:00:00+03:00');
    const later = await createSubscription(customer, {
      priceAgorot: 20_000,
      createdAt: new Date('2026-10-12T10:00:00+03:00'),
    });
    const subscription = await createSubscription(customer, {
      priceAgorot: 30_000,
      createdAt: instant,
    });
    const visit = await createVisit(spaceId, {
      ...stay('2026-10-10', '09:00', '10:00'),
      customerId: customer.id,
      chargeAgorot: 1_500,
      createdAt: instant,
    });
    await pay({ subscriptionId: subscription.id }, 5_000);

    expect(await repository.itemBalances(spaceId, customer.id, NOW)).toEqual([
      { kind: 'VISIT', id: visit.id, dueAgorot: 1_500, paidAgorot: 0, createdAt: instant },
      {
        kind: 'SUBSCRIPTION',
        id: subscription.id,
        dueAgorot: 30_000,
        paidAgorot: 5_000,
        createdAt: instant,
      },
      {
        kind: 'SUBSCRIPTION',
        id: later.id,
        dueAgorot: 20_000,
        paidAgorot: 0,
        createdAt: new Date('2026-10-12T10:00:00+03:00'),
      },
    ]);
  });
});
