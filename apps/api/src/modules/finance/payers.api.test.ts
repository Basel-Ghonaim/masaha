import { randomUUID } from 'node:crypto';

import type { Payer } from '@masaha/shared/finance';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, errorOf } from '../../../test/admin.ts';
import {
  createCustomer,
  createSpace,
  createSubscription,
  createVisit,
  stay,
} from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// Who paid in a month (docs/api/api-contract.md › Finance): each customer of the month's
// payments not voided, with what they paid then. Now is Thursday 2026-10-29, 10:00 in Gaza.
const NOW = new Date('2026-10-29T10:00:00+02:00');
const app = createTestApp({ clock: () => NOW });

let spaceId: number;
let owner: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
});

/** A payment of `amountAgorot` on an item, received at `at`; voided after, when asked. */
async function pay(
  item: { visitId: number } | { subscriptionId: number },
  amountAgorot: number,
  at: string,
  { voided = false, space = spaceId } = {},
) {
  const { id } = await prisma.payment.create({
    data: {
      spaceId: space,
      ...item,
      idempotencyKey: randomUUID(),
      recordedById: owner.id,
      method: 'CASH',
      amountAgorot,
      receivedAt: new Date(at),
    },
  });
  if (voided) {
    await prisma.payment.update({
      where: { id },
      data: { voidedAt: NOW, voidedById: owner.id, voidReason: 'Counted twice' },
    });
  }
}

/** A closed visit of this customer (or a walk-in's), charged `chargeAgorot`. */
async function visitOf(customerId: number | null, chargeAgorot: number, space = spaceId) {
  return createVisit(space, { ...stay('2026-10-02', '09:00', '12:00'), customerId, chargeAgorot });
}

/** A customer of the space with a subscription, paid `amount` at `at`. */
async function subscriber(name: string, amount: number, at: string, data = {}) {
  const customer = await createCustomer(spaceId, { name, ...data });
  const subscription = await createSubscription(customer, { priceAgorot: 50_000 });
  await pay({ subscriptionId: subscription.id }, amount, at);
  return customer;
}

function payers(query = '') {
  return request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/finance/payers${query}`)
    .set('Authorization', owner.authorization);
}

const rowsOf = (response: request.Response) => dataOf(response) as Payer[];
const metaOf = (response: request.Response) =>
  (response.body as { meta: { totalRecords: number; totalPages: number } }).meta;

describe('who paid in a month', () => {
  it("the customers who paid in the month, the latest first, each with what they paid then; a walk-in's payment names no one; a voided payment leaves its customer out", async () => {
    // Ali: a subscription's 10,000 on the 5th and a visit's 500 on the 20th.
    const ali = await subscriber('Ali', 10_000, '2026-10-05T10:00:00+03:00');
    await pay({ visitId: (await visitOf(ali.id, 500)).id }, 500, '2026-10-20T10:00:00+03:00');
    // Badr: a visit's 2,000 yesterday, the latest.
    const badr = await createCustomer(spaceId, { name: 'Badr' });
    await pay({ visitId: (await visitOf(badr.id, 2_000)).id }, 2_000, '2026-10-28T09:00:00+02:00');
    // Fadi and Ghada at the same instant: by customer id.
    const fadi = await subscriber('Fadi', 3_000, '2026-10-15T12:00:00+03:00');
    const ghada = await subscriber('Ghada', 4_000, '2026-10-15T12:00:00+03:00');
    // Archived since: still a payer of the month.
    const archived = await subscriber('Eman', 1_000, '2026-10-10T10:00:00+03:00', {
      archivedAt: new Date('2026-10-20T10:00:00+03:00'),
    });
    // Left out: a voided payment's customer, a walk-in's visit, September's payer, another space's.
    await subscriber('Voided', 5_000, '2026-10-25T10:00:00+03:00');
    await prisma.payment.updateMany({
      where: { amountAgorot: 5_000 },
      data: { voidedAt: NOW, voidedById: owner.id, voidReason: 'Counted twice' },
    });
    await pay({ visitId: (await visitOf(null, 800)).id }, 800, '2026-10-27T10:00:00+03:00');
    const september = await subscriber('September', 7_000, '2026-09-30T23:30:00+03:00');
    const { id: elsewhere } = await createSpace('elsewhere');
    const stranger = await createCustomer(elsewhere, { name: 'Elsewhere' });
    await pay(
      { visitId: (await visitOf(stranger.id, 9_000, elsewhere)).id },
      9_000,
      '2026-10-26T10:00:00+03:00',
      { space: elsewhere },
    );

    const first = await payers('?limit=3');

    expect(first.status).toBe(200);
    expect(rowsOf(first)).toEqual([
      {
        customer: { id: badr.id, name: 'Badr' },
        paidAgorot: 2_000,
        lastPaidAt: '2026-10-28T07:00:00.000Z',
      },
      {
        customer: { id: ali.id, name: 'Ali' },
        paidAgorot: 10_500,
        lastPaidAt: '2026-10-20T07:00:00.000Z',
      },
      {
        customer: { id: fadi.id, name: 'Fadi' },
        paidAgorot: 3_000,
        lastPaidAt: '2026-10-15T09:00:00.000Z',
      },
    ]);
    expect(metaOf(first)).toMatchObject({ totalRecords: 5, totalPages: 2 });
    const second = await payers('?limit=3&page=2');
    expect(rowsOf(second).map(({ customer }) => customer)).toEqual([
      { id: ghada.id, name: 'Ghada' },
      { id: archived.id, name: 'Eman' },
    ]);
    const past = await payers('?limit=3&page=3');
    expect(rowsOf(past)).toEqual([]);
    expect(metaOf(past).totalRecords).toBe(5);

    // September: its payer at 23:30 on its last day.
    expect(rowsOf(await payers('?month=2026-09'))).toEqual([
      {
        customer: { id: september.id, name: 'September' },
        paidAgorot: 7_000,
        lastPaidAt: '2026-09-30T20:30:00.000Z',
      },
    ]);
  });

  it('a month ahead, or 24 months back, is 422 out_of_range on month', async () => {
    for (const month of ['2026-11', '2024-10']) {
      const refused = await payers(`?month=${month}`);
      expect(refused.status).toBe(422);
      expect(errorOf(refused).errors).toEqual({ month: ['out_of_range'] });
    }
    expect((await payers('?month=2024-11')).status).toBe(200);
  });
});
