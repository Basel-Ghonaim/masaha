import { randomUUID } from 'node:crypto';

import type { BalanceRow, DebtsMeta } from '@masaha/shared/finance';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf } from '../../../test/admin.ts';
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

// Who owes and who is in credit (docs/api/api-contract.md › Finance): the ledger's one balance
// rule, an archived customer's debt kept and marked; the totals and the uncollected visits apart.
// Now is Thursday 2026-10-29, 10:00 in Gaza.
const NOW = new Date('2026-10-29T10:00:00+02:00');
const app = createTestApp({ clock: () => NOW });
const PHONE = '+970599000001';

let spaceId: number;
let owner: { id: number; authorization: string };

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
});

/** A payment on an item, received last week; voided after, when asked. */
async function pay(
  item: { visitId: number } | { subscriptionId: number },
  amountAgorot: number,
  { voided = false } = {},
) {
  const { id } = await prisma.payment.create({
    data: {
      spaceId,
      ...item,
      idempotencyKey: randomUUID(),
      recordedById: owner.id,
      method: 'CASH',
      amountAgorot,
      receivedAt: new Date('2026-10-22T10:00:00+03:00'),
    },
  });
  if (voided) {
    await prisma.payment.update({
      where: { id },
      data: { voidedAt: NOW, voidedById: owner.id, voidReason: 'Counted twice' },
    });
  }
}

/** A visit closed on its day, of this customer (or none), with this charge (or none). */
function closedVisit(
  customerId: number | null,
  chargeAgorot: number | null,
  {
    day = '2026-10-20',
    visitorName = 'Omar',
    auto = false,
  }: { day?: string; visitorName?: string | null; auto?: boolean } = {},
) {
  return createVisit(spaceId, {
    ...stay(day, '09:00', '12:00'),
    ...(auto && { checkoutMethod: 'AUTO' as const }),
    customerId,
    chargeAgorot,
    visitorName,
    createdAt: new Date(`${day}T09:00:00+03:00`),
  });
}

/**
 * The space's balances. Who owes: Large 32,000 (a visit of the 18th by Omar, its oldest, and a
 * subscription of 30,000), Archived 10,000 (a subscription of the 1st), Small 1,000 (a visit with
 * no visitor's name), Other 700 (a voided payment's visit; its written-off and unpriced visits owe
 * nothing). In credit: Less 1,000, More 4,000, made in that order. Uncollected, apart: three
 * walk-in visits, one unpriced, owing 4,500; a written-off one not. The customers are made in an
 * order unlike their amounts', so the order is the amounts'.
 */
async function seedBalances() {
  const small = await createCustomer(spaceId, { name: 'Small' });
  const smallVisit = await closedVisit(small.id, 1_000, { visitorName: null });
  const large = await createCustomer(spaceId, { name: 'Large', phone: PHONE });
  const largeVisit = await closedVisit(large.id, 2_000, { day: '2026-10-18' });
  await createSubscription(large, { priceAgorot: 30_000 });
  const archived = await createCustomer(spaceId, {
    name: 'Archived',
    archivedAt: new Date('2026-10-25T10:00:00+03:00'),
  });
  const archivedSubscription = await createSubscription(archived, {
    name: 'شهري',
    priceAgorot: 10_000,
    createdAt: new Date('2026-10-01T10:00:00+03:00'),
  });
  const other = await createCustomer(spaceId, { name: 'Other' });
  const writtenOff = await closedVisit(other.id, 9_000, { day: '2026-10-10' });
  await prisma.visit.update({
    where: { id: writtenOff.id },
    data: { writtenOffAt: NOW, writtenOffById: owner.id, writeOffReason: 'Gone' },
  });
  await closedVisit(other.id, null, { day: '2026-10-11' });
  const voided = await closedVisit(other.id, 700, { day: '2026-10-12' });
  await pay({ visitId: voided.id }, 700, { voided: true });

  const less = await createCustomer(spaceId, { name: 'Less' });
  const perDay = await createSubscription(less, { billing: 'PER_DAY', priceAgorot: 2_500 });
  await pay({ subscriptionId: perDay.id }, 1_000);
  const more = await createCustomer(spaceId, { name: 'More' });
  const perHour = await createSubscription(more, { billing: 'PER_HOUR', priceAgorot: 600 });
  await pay({ subscriptionId: perHour.id }, 4_000);

  const partly = await closedVisit(null, 4_000, { auto: true });
  await pay({ visitId: partly.id }, 1_500);
  await closedVisit(null, null, { auto: true });
  await closedVisit(null, 2_000);
  const forgiven = await closedVisit(null, 6_000, { auto: true });
  await prisma.visit.update({
    where: { id: forgiven.id },
    data: { writtenOffAt: NOW, writtenOffById: owner.id, writeOffReason: 'Gone' },
  });

  // Another space's debtor: never counted.
  const elsewhere = await createSpace('elsewhere');
  const stranger = await createCustomer(elsewhere.id, { name: 'Elsewhere' });
  await createSubscription(stranger, { priceAgorot: 50_000 });

  return {
    large,
    largeVisit,
    archived,
    archivedSubscription,
    small,
    smallVisit,
    other,
    more,
    less,
  };
}

function debts(query = '') {
  return request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/finance/debts${query}`)
    .set('Authorization', owner.authorization);
}

const rowsOf = (response: request.Response) => dataOf(response) as BalanceRow[];
const metaOf = (response: request.Response) => (response.body as { meta: DebtsMeta }).meta;

describe('who owes and who is in credit', () => {
  it('who owes, largest first, paged, the total right: the phone, an archived customer kept and marked, the oldest item still owing and its day', async () => {
    const seeded = await seedBalances();

    const first = await debts('?limit=2');

    expect(first.status).toBe(200);
    expect(rowsOf(first)).toEqual([
      {
        customer: { id: seeded.large.id, name: 'Large', phone: PHONE, archived: false },
        amountAgorot: 32_000,
        oldestItem: { kind: 'VISIT', id: seeded.largeVisit.id, name: 'Omar', since: '2026-10-18' },
      },
      {
        customer: { id: seeded.archived.id, name: 'Archived', phone: null, archived: true },
        amountAgorot: 10_000,
        oldestItem: {
          kind: 'SUBSCRIPTION',
          id: seeded.archivedSubscription.id,
          name: 'شهري',
          since: '2026-10-01',
        },
      },
    ]);
    expect(metaOf(first)).toMatchObject({ currentPage: 1, totalRecords: 4, totalPages: 2 });

    const second = await debts('?limit=2&page=2');
    expect(rowsOf(second)).toEqual([
      {
        customer: { id: seeded.small.id, name: 'Small', phone: null, archived: false },
        amountAgorot: 1_000,
        // No visitor's name: the customer's.
        oldestItem: { kind: 'VISIT', id: seeded.smallVisit.id, name: 'Small', since: '2026-10-20' },
      },
      {
        customer: { id: seeded.other.id, name: 'Other', phone: null, archived: false },
        amountAgorot: 700,
        oldestItem: expect.objectContaining({ kind: 'VISIT', since: '2026-10-12' }) as unknown,
      },
    ]);
    // Past the last page: no rows, the total still right.
    const past = await debts('?limit=2&page=3');
    expect(rowsOf(past)).toEqual([]);
    expect(metaOf(past).totalRecords).toBe(4);
  });

  it('who is in credit, largest first', async () => {
    const seeded = await seedBalances();

    const response = await debts('?state=CREDIT');

    expect(rowsOf(response)).toEqual([
      {
        customer: { id: seeded.more.id, name: 'More', phone: null, archived: false },
        amountAgorot: 4_000,
        oldestItem: null,
      },
      {
        customer: { id: seeded.less.id, name: 'Less', phone: null, archived: false },
        amountAgorot: 1_000,
        oldestItem: null,
      },
    ]);
    expect(metaOf(response).totalRecords).toBe(2);
  });

  it("a written-off visit, a voided payment and an unpriced visit owe nothing; a walk-in's uncollected visit counts apart, its unpriced too", async () => {
    const seeded = await seedBalances();

    const response = await debts();

    const other = rowsOf(response).find(({ customer }) => customer.id === seeded.other.id);
    // Only the visit whose payment was voided owes: in full.
    expect(other?.amountAgorot).toBe(700);
    expect(metaOf(response).totals.uncollected).toEqual({
      visits: 3,
      owedAgorot: 2_500 + 2_000,
      unpriced: 1,
    });
    const uncollected = await request(app)
      .get(`/api/v1/manage/spaces/${String(spaceId)}/uncollected-visits`)
      .set('Authorization', owner.authorization);
    expect((uncollected.body as { meta: { totalRecords: number } }).meta.totalRecords).toBe(3);
  });

  it("an auto-closed visit left to a customer is in that customer's debt and in the uncollected count too, as the desk's list keeps it: the two are never added", async () => {
    const debtor = await createCustomer(spaceId, { name: 'Debtor', phone: PHONE });
    // «تسجيل دينًا» sets the visit's customer and leaves it closed by the auto check-out.
    const left = await closedVisit(debtor.id, 4_000, { auto: true });

    const response = await debts();

    expect(rowsOf(response)).toEqual([
      {
        customer: { id: debtor.id, name: 'Debtor', phone: PHONE, archived: false },
        amountAgorot: 4_000,
        oldestItem: { kind: 'VISIT', id: left.id, name: 'Omar', since: '2026-10-20' },
      },
    ]);
    expect(metaOf(response).totals).toMatchObject({
      owed: { agorot: 4_000, customers: 1 },
      uncollected: { visits: 1, owedAgorot: 4_000, unpriced: 0 },
    });
    const uncollected = await request(app)
      .get(`/api/v1/manage/spaces/${String(spaceId)}/uncollected-visits`)
      .set('Authorization', owner.authorization);
    expect((uncollected.body as { meta: { totalRecords: number } }).meta.totalRecords).toBe(1);
  });

  it('the totals agree with every page’s rows, and the reminder template is the space’s, null by default', async () => {
    await seedBalances();

    for (const state of ['OWES', 'CREDIT'] as const) {
      const rows: BalanceRow[] = [];
      let meta: DebtsMeta | undefined;
      for (let page = 1; page <= 4; page += 1) {
        const response = await debts(`?state=${state}&limit=1&page=${String(page)}`);
        rows.push(...rowsOf(response));
        meta = metaOf(response);
      }
      const totals = state === 'OWES' ? meta?.totals.owed : meta?.totals.credit;
      expect(totals).toEqual({
        agorot: rows.reduce((sum, { amountAgorot }) => sum + amountAgorot, 0),
        customers: rows.length,
      });
    }
    const meta = metaOf(await debts());
    expect(meta.totals).toEqual({
      owed: { agorot: 32_000 + 10_000 + 1_000 + 700, customers: 4 },
      credit: { agorot: 5_000, customers: 2 },
      uncollected: { visits: 3, owedAgorot: 4_500, unpriced: 1 },
    });
    expect(meta.reminderTemplate).toBeNull();

    await prisma.spaceSettings.update({
      where: { spaceId },
      data: { reminderTemplate: 'عليك {المبلغ}' },
    });
    expect(metaOf(await debts()).reminderTemplate).toBe('عليك {المبلغ}');
  });

  it('a space with no balances: no rows, every total zero', async () => {
    const response = await debts();

    expect(rowsOf(response)).toEqual([]);
    expect(metaOf(response)).toMatchObject({
      totalRecords: 0,
      totals: {
        owed: { agorot: 0, customers: 0 },
        credit: { agorot: 0, customers: 0 },
        uncollected: { visits: 0, owedAgorot: 0, unpriced: 0 },
      },
    });
  });
});
