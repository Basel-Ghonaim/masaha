import { randomUUID } from 'node:crypto';

import type { IncomeReport } from '@masaha/shared/finance';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, errorOf, signIn } from '../../../test/admin.ts';
import {
  createCustomer,
  createSpace,
  createSubscription,
  createVisit,
} from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// The owner's income (docs/api/api-contract.md › Finance): the payments not voided, each on the
// Gaza day it was received. Now is Thursday 2026-10-29, 10:00 in Gaza (UTC+2 since the
// 2026-10-24 change; UTC+3 before it).
const NOW = new Date('2026-10-29T10:00:00+02:00');
const app = createTestApp({ clock: () => NOW });

let spaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  await prisma.user.update({ where: { id: owner.id }, data: { name: 'Ahmad' } });
  reception = await signIn('USER', 'reception@example.com');
  await prisma.user.update({ where: { id: reception.id }, data: { name: 'Hala' } });
  await prisma.spaceManager.create({ data: { spaceId, userId: reception.id, role: 'RECEPTION' } });
});

interface Paid {
  at: string;
  by?: number;
  method?: 'CASH' | 'TRANSFER';
  voided?: boolean;
  space?: number;
}

/** A payment of `amountAgorot` on an item, received at `at`; voided after, when asked. */
async function pay(
  item: { visitId: number } | { subscriptionId: number },
  amountAgorot: number,
  { at, by = owner.id, method = 'CASH', voided = false, space = spaceId }: Paid,
) {
  const { id } = await prisma.payment.create({
    data: {
      spaceId: space,
      ...item,
      idempotencyKey: randomUUID(),
      recordedById: by,
      method,
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

/** A walk-in's visit closed on its day with this charge, paid `amount` at `at`. */
async function paidVisit(chargeAgorot: number, amount: number, paid: Paid) {
  const day = paid.at.slice(0, 10);
  const visit = await createVisit(paid.space ?? spaceId, {
    checkedInAt: new Date(`${day}T00:10:00+02:00`),
    checkedOutAt: new Date(`${day}T00:20:00+02:00`),
    checkoutMethod: 'MANUAL',
    chargeAgorot,
  });
  await pay({ visitId: visit.id }, amount, paid);
  return visit;
}

/** A subscription of the space paid `amount` at `at`. */
async function paidSubscription(priceAgorot: number, amount: number, paid: Paid) {
  const customer = await createCustomer(paid.space ?? spaceId);
  const subscription = await createSubscription(customer, { priceAgorot });
  await pay({ subscriptionId: subscription.id }, amount, paid);
}

/**
 * The ledger the tests read. October: a subscription's 30,000 by reception; visits of 2,000 today
 * by transfer, 1,000 on a visit written off since, and 800 at 00:30 on the 1st (still the 30th in
 * UTC); 5,000 voided. September: a subscription's 10,000 and a visit's 500 at 23:30 on the 30th.
 * The first payment not voided on 2025-11-20; one voided before it.
 */
async function seedLedger() {
  await paidSubscription(30_000, 30_000, {
    at: '2026-10-05T10:00:00+03:00',
    by: reception.id,
  });
  await paidVisit(2_000, 2_000, { at: '2026-10-29T09:00:00+02:00', method: 'TRANSFER' });
  await paidVisit(5_000, 5_000, { at: '2026-10-10T12:00:00+03:00', voided: true });
  const writtenOff = await paidVisit(3_000, 1_000, { at: '2026-10-12T12:00:00+03:00' });
  await prisma.visit.update({
    where: { id: writtenOff.id },
    data: { writtenOffAt: NOW, writtenOffById: owner.id, writeOffReason: 'Gone' },
  });
  await paidVisit(800, 800, { at: '2026-10-01T00:30:00+03:00' });
  await paidSubscription(10_000, 10_000, { at: '2026-09-15T10:00:00+03:00' });
  await paidVisit(500, 500, { at: '2026-09-30T23:30:00+03:00' });
  await paidVisit(700, 700, { at: '2025-11-20T10:00:00+02:00' });
  await paidVisit(900, 900, { at: '2025-06-01T10:00:00+03:00', voided: true });
}

function income(query = '') {
  return request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/finance/income${query}`)
    .set('Authorization', owner.authorization);
}

const reportOf = (response: request.Response) => dataOf(response) as IncomeReport;
const split = (subscriptionsAgorot: number, visitsAgorot: number) => ({
  subscriptionsAgorot,
  visitsAgorot,
  totalAgorot: subscriptionsAgorot + visitsAgorot,
});

describe("the owner's income", () => {
  it("the month's income by subscriptions and visits, the month before, today and all time with its first day: voided payments left out; a written-off visit's payment counted as received", async () => {
    await seedLedger();

    const response = await income();

    expect(response.status).toBe(200);
    const report = reportOf(response);
    expect(report.month).toBe('2026-10');
    expect(report.income).toEqual(split(30_000, 2_000 + 1_000 + 800));
    expect(report.previousMonth).toEqual(split(10_000, 500));
    expect(report.today).toEqual(split(0, 2_000));
    expect(report.allTime).toEqual({
      ...split(40_000, 2_000 + 1_000 + 800 + 500 + 700),
      since: '2025-11-20',
    });

    // A month asked: September, the month before it August.
    const september = reportOf(await income('?month=2026-09'));
    expect(september.month).toBe('2026-09');
    expect(september.income).toEqual(split(10_000, 500));
    expect(september.previousMonth).toEqual(split(0, 0));
    expect(september.today).toEqual(split(0, 2_000));
  });

  it("the 12 months and the visits' 30 days by Gaza day: a payment at 23:30 on a month's last day counts in that month and that day", async () => {
    await seedLedger();

    const report = reportOf(await income('?month=2026-09'));

    // Ending with the current month, whatever the month asked.
    expect(report.months.map(({ month }) => month)).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ]);
    const byMonth = new Map(report.months.map(({ month, income: totals }) => [month, totals]));
    expect(byMonth.get('2025-11')).toEqual(split(0, 700));
    expect(byMonth.get('2026-09')).toEqual(split(10_000, 500));
    expect(byMonth.get('2026-10')).toEqual(split(30_000, 3_800));
    expect(byMonth.get('2026-06')).toEqual(split(0, 0));

    expect(report.visitsByDay).toHaveLength(30);
    expect(report.visitsByDay[0]).toEqual({ date: '2026-09-30', agorot: 500 });
    expect(report.visitsByDay.at(-1)).toEqual({ date: '2026-10-29', agorot: 2_000 });
    expect(report.visitsByDay.filter(({ agorot }) => agorot > 0)).toEqual([
      { date: '2026-09-30', agorot: 500 },
      { date: '2026-10-01', agorot: 800 },
      { date: '2026-10-12', agorot: 1_000 },
      { date: '2026-10-29', agorot: 2_000 },
    ]);
  });

  it("each staff member's collections for the month by method, named, an ex-reception's included", async () => {
    await seedLedger();
    // Reception's link ended since: its collections still count, named.
    await prisma.spaceManager.update({
      where: { spaceId_userId: { spaceId, userId: reception.id } },
      data: { deactivatedAt: NOW },
    });

    const report = reportOf(await income());

    expect(report.collections).toEqual([
      {
        recordedBy: { id: reception.id, name: 'Hala' },
        count: 1,
        totalAgorot: 30_000,
        byMethod: { CASH: 30_000, TRANSFER: 0 },
      },
      {
        recordedBy: { id: owner.id, name: 'Ahmad' },
        count: 3,
        totalAgorot: 3_800,
        byMethod: { CASH: 1_800, TRANSFER: 2_000 },
      },
    ]);
    // September's: the owner's two.
    expect(reportOf(await income('?month=2026-09')).collections).toEqual([
      {
        recordedBy: { id: owner.id, name: 'Ahmad' },
        count: 2,
        totalAgorot: 10_500,
        byMethod: { CASH: 10_500, TRANSFER: 0 },
      },
    ]);
  });

  it("another space's payments never counted", async () => {
    await seedLedger();
    const { id: elsewhere } = await createSpace('elsewhere');
    await paidVisit(9_000, 9_000, { at: '2026-10-29T08:00:00+02:00', space: elsewhere });
    await paidSubscription(50_000, 50_000, { at: '2025-01-10T10:00:00+02:00', space: elsewhere });

    const report = reportOf(await income());

    expect(report.income).toEqual(split(30_000, 3_800));
    expect(report.today).toEqual(split(0, 2_000));
    expect(report.allTime).toEqual({ ...split(40_000, 5_000), since: '2025-11-20' });
    expect(report.collections.map(({ totalAgorot }) => totalAgorot)).toEqual([30_000, 3_800]);
  });

  it('a space with no payment: every figure zero, all time with no first day', async () => {
    const report = reportOf(await income());

    expect(report.income).toEqual(split(0, 0));
    expect(report.allTime).toEqual({ ...split(0, 0), since: null });
    expect(report.months).toHaveLength(12);
    expect(report.visitsByDay).toHaveLength(30);
    expect(report.collections).toEqual([]);
  });

  it('a month ahead, or 24 months back, is 422 out_of_range on month; 23 back answers', async () => {
    for (const month of ['2026-11', '2024-10']) {
      const refused = await income(`?month=${month}`);
      expect(refused.status).toBe(422);
      expect(errorOf(refused)).toMatchObject({
        type: 'validation',
        errors: { month: ['out_of_range'] },
      });
    }
    const malformed = await income('?month=2026-1');
    expect(malformed.status).toBe(422);
    expect(errorOf(malformed).errors).toEqual({ month: ['invalid_format'] });

    const earliest = await income('?month=2024-11');
    expect(earliest.status).toBe(200);
    expect(reportOf(earliest).month).toBe('2024-11');
  });
});
