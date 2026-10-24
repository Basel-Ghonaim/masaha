import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, errorOf, signIn } from '../../../test/admin.ts';
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

// The payments list (docs/api/api-contract.md › Front desk (managed)): the owner's ledger by Gaza
// days, staff, method, kind and void, with the totals of its whole filter; reception's own of today.

const NOW = new Date('2026-10-20T10:00:00+03:00');
const app = createTestApp({ clock: () => NOW });

let spaceId: number;
let otherSpaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };
let otherReception: { id: number; authorization: string };
let stranger: { id: number; authorization: string };
let unrelatedOwner: { id: number; authorization: string };
let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  otherReception = await signIn('USER', 'reception-2@example.com');
  stranger = await signIn('USER', 'stranger@example.com');
  ({ id: otherSpaceId } = await createSpace('other-space'));
  unrelatedOwner = await signInOwnerOf(otherSpaceId);
  admin = await signIn('ADMIN');
  for (const { id } of [reception, otherReception]) {
    await prisma.spaceManager.create({ data: { spaceId, userId: id, role: 'RECEPTION' } });
  }
});

/** A visit of the space closed by hand on 18 Oct, its charge large enough for every payment here. */
function closed({
  customerId = null,
  space = spaceId,
}: { customerId?: number | null; space?: number } = {}) {
  return createVisit(space, {
    ...stay('2026-10-18', '09:00', '12:00'),
    chargeAgorot: 100_000,
    customerId,
  });
}

type Item = { visitId: number } | { subscriptionId: number };

/** A payment of the item, received at `at`, by `by` (reception unless told), cash unless told. */
function pay(
  item: Item,
  amountAgorot: number,
  at: string,
  {
    by = reception.id,
    method = 'CASH',
    space = spaceId,
  }: { by?: number; method?: 'CASH' | 'TRANSFER'; space?: number } = {},
) {
  return prisma.payment.create({
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
}

function voidOf(id: number, reason = 'Recorded twice') {
  return prisma.payment.update({
    where: { id },
    data: {
      voidedAt: new Date('2026-10-19T18:00:00+03:00'),
      voidedById: owner.id,
      voidReason: reason,
    },
  });
}

function list(caller: { authorization: string }, query = '') {
  return request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/payments${query}`)
    .set('Authorization', caller.authorization);
}

const idsOf = (response: request.Response) =>
  (dataOf(response) as { id: number }[]).map(({ id }) => id);
const metaOf = (response: request.Response) =>
  (response.body as { meta: { totals: unknown; totalRecords: number } }).meta;
const DAY = '?from=2026-10-19&to=2026-10-19';

/** A visit with its customer, a subscription of that customer, and three payments of 19 Oct. */
async function ledger() {
  const customer = await createCustomer(spaceId, { name: 'Rami' });
  const visit = await closed({ customerId: customer.id });
  const monthly = await createSubscription(customer, { billing: 'FIXED', priceAgorot: 30_000 });
  const morning = await pay({ visitId: visit.id }, 1_000, '2026-10-19T09:00:00+03:00');
  const transfer = await pay({ subscriptionId: monthly.id }, 5_000, '2026-10-19T12:00:00+03:00', {
    by: owner.id,
    method: 'TRANSFER',
  });
  // Received at the same instant as the transfer: the later id comes first.
  const noon = await pay({ visitId: visit.id }, 500, '2026-10-19T12:00:00+03:00');
  await voidOf(transfer.id);
  return { customer, visit, monthly, morning, transfer, noon };
}

describe('the owner’s payments list', () => {
  it('the owner lists a range newest received first, then by id, paged; each row names its item, its customer, who recorded it, and a void’s who, when and why', async () => {
    const { customer, visit, monthly, morning, transfer, noon } = await ledger();

    const response = await list(owner, DAY);
    expect(response.status).toBe(200);
    expect(idsOf(response)).toEqual([noon.id, transfer.id, morning.id]);
    const [, voided, cash] = dataOf(response) as unknown[];
    expect(voided).toEqual({
      id: transfer.id,
      amountAgorot: 5_000,
      method: 'TRANSFER',
      note: null,
      receivedAt: '2026-10-19T09:00:00.000Z',
      item: { kind: 'SUBSCRIPTION', id: monthly.id, name: 'شهري' },
      customer: { id: customer.id, name: 'Rami' },
      recordedBy: { id: owner.id, name: 'Ahmad' },
      voided: {
        at: '2026-10-19T15:00:00.000Z',
        by: { id: owner.id, name: 'Ahmad' },
        reason: 'Recorded twice',
      },
    });
    expect(cash).toEqual({
      id: morning.id,
      amountAgorot: 1_000,
      method: 'CASH',
      note: null,
      receivedAt: '2026-10-19T06:00:00.000Z',
      item: { kind: 'VISIT', id: visit.id, visitorName: 'Omar' },
      customer: { id: customer.id, name: 'Rami' },
      recordedBy: { id: reception.id, name: 'Sara' },
      voided: null,
    });

    const first = await list(owner, `${DAY}&limit=2`);
    expect(idsOf(first)).toEqual([noon.id, transfer.id]);
    expect(metaOf(first)).toMatchObject({
      currentPage: 1,
      limit: 2,
      totalPages: 2,
      totalRecords: 3,
      hasNextPage: true,
      hasPreviousPage: false,
    });
    expect(idsOf(await list(owner, `${DAY}&limit=2&page=2`))).toEqual([morning.id]);
  });

  it('the range counts Gaza days, both included (23:30 on to in, 00:00 after it out); recordedById, method, kind and voided filter', async () => {
    const { visit, monthly, morning, transfer, noon } = await ledger();
    const before = await pay({ visitId: visit.id }, 100, '2026-10-18T23:59:00+03:00');
    const first = await pay({ visitId: visit.id }, 100, '2026-10-19T00:00:00+03:00');
    const late = await pay({ subscriptionId: monthly.id }, 100, '2026-10-19T23:30:00+03:00', {
      by: otherReception.id,
    });
    const after = await pay({ visitId: visit.id }, 100, '2026-10-20T00:00:00+03:00');

    expect(idsOf(await list(owner, DAY))).toEqual([
      late.id,
      noon.id,
      transfer.id,
      morning.id,
      first.id,
    ]);
    expect(idsOf(await list(owner, '?from=2026-10-18&to=2026-10-20'))).toEqual([
      after.id,
      late.id,
      noon.id,
      transfer.id,
      morning.id,
      first.id,
      before.id,
    ]);
    expect(idsOf(await list(owner, `${DAY}&recordedById=${String(otherReception.id)}`))).toEqual([
      late.id,
    ]);
    expect(idsOf(await list(owner, `${DAY}&method=TRANSFER`))).toEqual([transfer.id]);
    expect(idsOf(await list(owner, `${DAY}&kind=SUBSCRIPTION`))).toEqual([late.id, transfer.id]);
    expect(idsOf(await list(owner, `${DAY}&kind=VISIT`))).toEqual([noon.id, morning.id, first.id]);
    expect(idsOf(await list(owner, `${DAY}&voided=EXCLUDE`))).toEqual([
      late.id,
      noon.id,
      morning.id,
      first.id,
    ]);
    expect(idsOf(await list(owner, `${DAY}&voided=ONLY`))).toEqual([transfer.id]);
  });

  it('the totals cover the whole filter but voided and the page: received, by method, the count, the voided count and amount; a voided payment is never received', async () => {
    const { visit } = await ledger();
    await pay({ visitId: visit.id }, 2_000, '2026-10-19T15:00:00+03:00', { method: 'TRANSFER' });
    // Hand-counted: received 1,000 + 500 cash and 2,000 transfer; the 5,000 transfer voided.
    const totals = {
      count: 3,
      receivedAgorot: 3_500,
      byMethod: { CASH: 1_500, TRANSFER: 2_000 },
      voided: { count: 1, amountAgorot: 5_000 },
    };

    for (const query of ['', '&limit=1', '&limit=1&page=3', '&voided=ONLY', '&voided=EXCLUDE']) {
      const response = await list(owner, `${DAY}${query}`);
      expect(response.status).toBe(200);
      expect(metaOf(response).totals).toEqual(totals);
    }
    expect(metaOf(await list(owner, `${DAY}&method=CASH`)).totals).toEqual({
      count: 2,
      receivedAgorot: 1_500,
      byMethod: { CASH: 1_500, TRANSFER: 0 },
      voided: { count: 0, amountAgorot: 0 },
    });
  });

  it('no range lists today’s (Gaza) payments only', async () => {
    const visit = await closed();
    const today = await pay({ visitId: visit.id }, 700, '2026-10-20T00:30:00+03:00');
    await pay({ visitId: visit.id }, 900, '2026-10-19T23:30:00+03:00');

    const response = await list(owner);
    expect(idsOf(response)).toEqual([today.id]);
    expect(metaOf(response).totals).toEqual({
      count: 1,
      receivedAgorot: 700,
      byMethod: { CASH: 700, TRANSFER: 0 },
      voided: { count: 0, amountAgorot: 0 },
    });
  });

  it('a range over 92 days is 422 out_of_range on to; half a range required', async () => {
    const longest = await list(owner, '?from=2026-07-21&to=2026-10-20');
    expect(longest.status).toBe(200);
    const tooLong = await list(owner, '?from=2026-07-21&to=2026-10-21');
    expect(tooLong.status).toBe(422);
    expect(errorOf(tooLong).errors).toEqual({ to: ['out_of_range'] });
    const half = await list(owner, '?from=2026-10-19');
    expect(half.status).toBe(422);
    expect(errorOf(half).errors).toEqual({ to: ['required'] });
  });
});

describe('reception’s payments of today', () => {
  it('reception lists its own payments of today: another receptionist’s, the owner’s and its own of yesterday absent; its own voided one listed and marked; the totals its own', async () => {
    const visit = await closed();
    const kept = await pay({ visitId: visit.id }, 1_000, '2026-10-20T08:00:00+03:00');
    const voided = await pay({ visitId: visit.id }, 400, '2026-10-20T09:00:00+03:00', {
      method: 'TRANSFER',
    });
    await voidOf(voided.id, 'Wrong amount');
    await pay({ visitId: visit.id }, 300, '2026-10-19T20:00:00+03:00');
    await pay({ visitId: visit.id }, 200, '2026-10-20T09:30:00+03:00', { by: otherReception.id });
    await pay({ visitId: visit.id }, 100, '2026-10-20T09:40:00+03:00', { by: owner.id });

    const response = await list(reception);
    expect(response.status).toBe(200);
    expect(idsOf(response)).toEqual([voided.id, kept.id]);
    expect((dataOf(response) as unknown[])[0]).toMatchObject({
      recordedBy: { id: reception.id },
      voided: { by: { id: owner.id, name: 'Ahmad' }, reason: 'Wrong amount' },
    });
    expect(metaOf(response).totals).toEqual({
      count: 1,
      receivedAgorot: 1_000,
      byMethod: { CASH: 1_000, TRANSFER: 0 },
      voided: { count: 1, amountAgorot: 400 },
    });
    expect(idsOf(await list(reception, '?voided=EXCLUDE&method=CASH&kind=VISIT'))).toEqual([
      kept.id,
    ]);
  });

  it("reception's from, to or recordedById is 403 before anything is read", async () => {
    for (const query of [DAY, `?recordedById=${String(reception.id)}`]) {
      const response = await list(reception, query);
      expect(response.status).toBe(403);
      expect(errorOf(response).type).toBe('forbidden');
    }
  });
});

describe('who reads the payments', () => {
  it("a stranger, another space's owner and the admin not_found; another space's payments never listed", async () => {
    const ours = await pay({ visitId: (await closed()).id }, 1_000, '2026-10-20T08:00:00+03:00');
    const theirVisit = await closed({ space: otherSpaceId });
    await pay({ visitId: theirVisit.id }, 1_000, '2026-10-20T08:30:00+03:00', {
      by: unrelatedOwner.id,
      space: otherSpaceId,
    });

    expect(idsOf(await list(owner))).toEqual([ours.id]);
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await list(caller);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
  });
});
