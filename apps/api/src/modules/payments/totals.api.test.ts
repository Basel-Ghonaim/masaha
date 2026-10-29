import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import {
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

// A space's balances and uncollected visits totalled in the database (docs/features/payments.md;
// the owner's decision 6): the page of who owes or is in credit, the totals, and the uncollected
// visits' counts, as of Wednesday 2026-10-21. The figures Finance and the owner's overview read.

const repository = createPaymentsRepository();
const NOW = { today: '2026-10-21', weekStart: '2026-10-17' };

let spaceId: number;
let recorderId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  ({ id: recorderId } = await createUser());
});

/** A payment on one item of a space. */
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

/** A visit of the space closed on this day, of this customer, with this charge (or none). */
function closedVisit(
  customerId: number | null,
  chargeAgorot: number | null,
  { day = '2026-10-20', space = spaceId } = {},
) {
  return createVisit(space, { ...stay(day, '09:00', '12:00'), customerId, chargeAgorot });
}

describe("the space's balances, paged and totalled", () => {
  it('the balances’ page: largest debt first, paged, the total right; the oldest owing item of each', async () => {
    const small = await createCustomer(spaceId, { name: 'Small' });
    await closedVisit(small.id, 1_000);
    const large = await createCustomer(spaceId, { name: 'Large' });
    // Its oldest owing item is the visit of the 18th; the subscription made later, then the
    // visit of the 19th paid in full, owe or not.
    const oldVisit = await closedVisit(large.id, 2_000, { day: '2026-10-18' });
    await prisma.visit.update({
      where: { id: oldVisit.id },
      data: { createdAt: new Date('2026-10-18T09:00:00+03:00') },
    });
    await createSubscription(large, { priceAgorot: 30_000 });
    const paidVisit = await closedVisit(large.id, 1_500, { day: '2026-10-17' });
    await prisma.visit.update({
      where: { id: paidVisit.id },
      data: { createdAt: new Date('2026-10-17T09:00:00+03:00') },
    });
    await pay({ visitId: paidVisit.id }, 1_500);
    const middle = await createCustomer(spaceId, { name: 'Middle' });
    const middleVisit = await closedVisit(middle.id, 5_000);
    // The same debt as Middle: by customer id after it.
    const tie = await createCustomer(spaceId, { name: 'Tie' });
    await closedVisit(tie.id, 5_000);
    // Settled: never on the page.
    const settled = await createCustomer(spaceId, { name: 'Settled' });
    await pay({ visitId: (await closedVisit(settled.id, 800)).id }, 800);

    const first = await repository.balancesPage(spaceId, 'OWES', NOW, { skip: 0, take: 2 });
    expect(first.total).toBe(4);
    expect(first.rows).toEqual([
      {
        customerId: large.id,
        amountAgorot: 32_000,
        oldest: { kind: 'VISIT', id: oldVisit.id, createdAt: new Date('2026-10-18T06:00:00Z') },
      },
      {
        customerId: middle.id,
        amountAgorot: 5_000,
        oldest: { kind: 'VISIT', id: middleVisit.id, createdAt: middleVisit.createdAt },
      },
    ]);
    const second = await repository.balancesPage(spaceId, 'OWES', NOW, { skip: 2, take: 2 });
    expect(second.total).toBe(4);
    expect(second.rows.map(({ customerId, amountAgorot }) => [customerId, amountAgorot])).toEqual([
      [tie.id, 5_000],
      [small.id, 1_000],
    ]);
    // Past the last page: no rows, the total still right.
    expect(await repository.balancesPage(spaceId, 'OWES', NOW, { skip: 4, take: 2 })).toEqual({
      rows: [],
      total: 4,
    });
  });

  it('who is in credit, largest first, with no oldest item', async () => {
    const less = await createCustomer(spaceId, { name: 'Less' });
    const perDay = await createSubscription(less, { billing: 'PER_DAY', priceAgorot: 2_500 });
    await pay({ subscriptionId: perDay.id }, 1_000);
    const more = await createCustomer(spaceId, { name: 'More' });
    const perHour = await createSubscription(more, { billing: 'PER_HOUR', priceAgorot: 600 });
    await pay({ subscriptionId: perHour.id }, 4_000);

    expect(await repository.balancesPage(spaceId, 'CREDIT', NOW, { skip: 0, take: 10 })).toEqual({
      rows: [
        { customerId: more.id, amountAgorot: 4_000, oldest: null },
        { customerId: less.id, amountAgorot: 1_000, oldest: null },
      ],
      total: 2,
    });
  });

  it('the totals: owed and credit, customers and agorot; an archived customer’s debt kept; a credit never offsets another item’s debt', async () => {
    // Owes 3,000 on a visit and holds 1,000 in credit on a per-day subscription: in both.
    const both = await createCustomer(spaceId, { name: 'Both' });
    await closedVisit(both.id, 3_000);
    const perDay = await createSubscription(both, { billing: 'PER_DAY', priceAgorot: 2_500 });
    await pay({ subscriptionId: perDay.id }, 1_000);
    const archived = await createCustomer(spaceId, {
      name: 'Archived',
      archivedAt: new Date('2026-10-20T10:00:00Z'),
    });
    await closedVisit(archived.id, 2_000);
    // A written-off visit, a voided payment's visit fully owed again, an unpriced visit.
    const other = await createCustomer(spaceId, { name: 'Other' });
    const writtenOff = await closedVisit(other.id, 9_000);
    await prisma.visit.update({
      where: { id: writtenOff.id },
      data: { writtenOffAt: new Date(), writtenOffById: recorderId, writeOffReason: 'Gone' },
    });
    await closedVisit(other.id, null);
    const voided = await closedVisit(other.id, 700);
    const payment = await pay({ visitId: voided.id }, 700);
    await prisma.payment.update({
      where: { id: payment.id },
      data: { voidedAt: new Date(), voidedById: recorderId, voidReason: 'Counted twice' },
    });
    // Another space's debt never counted.
    const elsewhere = await createSpace('elsewhere');
    const stranger = await createCustomer(elsewhere.id, { name: 'Elsewhere' });
    await closedVisit(stranger.id, 50_000, { space: elsewhere.id });

    expect(await repository.balanceTotals(spaceId, NOW)).toEqual({
      owed: { agorot: 3_000 + 2_000 + 700, customers: 3 },
      credit: { agorot: 1_000, customers: 1 },
    });
  });

  it('a space with no balances totals zero', async () => {
    expect(await repository.balanceTotals(spaceId, NOW)).toEqual({
      owed: { agorot: 0, customers: 0 },
      credit: { agorot: 0, customers: 0 },
    });
    expect(await repository.balancesPage(spaceId, 'OWES', NOW, { skip: 0, take: 10 })).toEqual({
      rows: [],
      total: 0,
    });
  });
});

describe("the space's uncollected visits, counted", () => {
  it('the uncollected totals count the desk’s list, its unpriced apart', async () => {
    const auto = (chargeAgorot: number | null, space = spaceId) =>
      createVisit(space, {
        ...stay('2026-10-20', '09:00', '23:59'),
        checkoutMethod: 'AUTO',
        chargeAgorot,
      });
    // Auto-closed: one priced and partly paid, one unpriced; a walk-in closed by hand, priced, unpaid.
    const partly = await auto(4_000);
    await pay({ visitId: partly.id }, 1_500);
    await auto(null);
    await closedVisit(null, 2_000);
    // Not on the list: settled, written off, a customer's visit closed by hand, another space's.
    await pay({ visitId: (await auto(1_000)).id }, 1_000);
    const writtenOff = await auto(3_000);
    await prisma.visit.update({
      where: { id: writtenOff.id },
      data: { writtenOffAt: new Date(), writtenOffById: recorderId, writeOffReason: 'Gone' },
    });
    const customer = await createCustomer(spaceId);
    await closedVisit(customer.id, 6_000);
    await auto(8_000, (await createSpace('elsewhere')).id);

    const totals = await repository.uncollectedTotals(spaceId);
    expect(totals).toEqual({ visits: 3, owedAgorot: 2_500 + 2_000, unpriced: 1 });
    expect(totals.visits).toBe(
      (await repository.uncollectedPage(spaceId, { skip: 0, take: 50 })).total,
    );
  });
});
