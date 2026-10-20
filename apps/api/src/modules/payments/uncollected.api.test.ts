import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createSpace, createVisit, stay } from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

const app = createTestApp({ clock: () => new Date('2026-10-18T10:20:00+03:00') });

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

/** A visit of the space closed by the auto check-out (unless told) at `to` on 17 Oct, with this charge. */
function closed(
  to: string,
  chargeAgorot: number | null,
  {
    checkoutMethod = 'AUTO',
    space = spaceId,
  }: { checkoutMethod?: 'AUTO' | 'MANUAL'; space?: number } = {},
) {
  return createVisit(space, {
    ...stay('2026-10-17', '09:00', to),
    checkoutMethod,
    chargeAgorot,
  });
}

/** A payment of the visit, by the owner. */
function pay(visitId: number, amountAgorot: number) {
  return prisma.payment.create({
    data: {
      spaceId,
      visitId,
      idempotencyKey: randomUUID(),
      recordedById: owner.id,
      method: 'CASH',
      amountAgorot,
    },
  });
}

function list(caller: { authorization: string }, query = '') {
  return request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/uncollected-visits${query}`)
    .set('Authorization', caller.authorization);
}

type Row = { visit: { id: number }; paidAgorot: number; balanceAgorot: number | null };
const rowsOf = (response: request.Response) =>
  (dataOf(response) as Row[]).map(({ visit, paidAgorot, balanceAgorot }) => ({
    id: visit.id,
    paidAgorot,
    balanceAgorot,
  }));

describe('the uncollected visits', () => {
  it("lists the visits closed automatically and not fully paid, the unpriced ones included; never a manual check-out's", async () => {
    const unpaid = await closed('18:00', 2_500);
    const partly = await closed('17:00', 2_000);
    await pay(partly.id, 500);
    const unpriced = await closed('16:00', null);
    await closed('15:00', 2_500, { checkoutMethod: 'MANUAL' });
    await closed('14:00', null, { checkoutMethod: 'MANUAL' });
    await closed('13:00', 2_500, { space: otherSpaceId });
    await createVisit(spaceId, { checkedInAt: new Date('2026-10-18T09:00:00+03:00') });

    const response = await list(owner);
    expect(response.status).toBe(200);
    expect(rowsOf(response)).toEqual([
      { id: unpaid.id, paidAgorot: 0, balanceAgorot: 2_500 },
      { id: partly.id, paidAgorot: 500, balanceAgorot: 1_500 },
      { id: unpriced.id, paidAgorot: 0, balanceAgorot: null },
    ]);
    expect((dataOf(response) as Row[])[0]?.visit).toEqual({
      id: unpaid.id,
      visitorName: 'Omar',
      customer: null,
      audience: 'GENERAL',
      shiftId: null,
      hourRateAgorot: null,
      dayRateAgorot: null,
      checkedInAt: '2026-10-17T06:00:00.000Z',
      checkedOutAt: '2026-10-17T15:00:00.000Z',
      checkoutMethod: 'AUTO',
      charge: {
        amountAgorot: 2_500,
        roundingRule: null,
        roundingMinutes: null,
        capApplied: null,
        typedById: null,
        reason: null,
      },
      writeOff: null,
    });
  });

  it('a visit paid in full leaves the list; a voided payment does not count', async () => {
    const paid = await closed('18:00', 2_000);
    await pay(paid.id, 1_500);
    await pay(paid.id, 500);
    const voided = await closed('17:00', 2_000);
    const payment = await pay(voided.id, 2_000);
    await prisma.payment.update({
      where: { id: payment.id },
      data: { voidedAt: new Date(), voidedById: owner.id, voidReason: 'Recorded twice' },
    });

    expect(rowsOf(await list(reception))).toEqual([
      { id: voided.id, paidAgorot: 0, balanceAgorot: 2_000 },
    ]);
  });

  it('every page is full and the total right', async () => {
    const first = await closed('18:00', 2_000);
    for (const to of ['17:00', '16:00']) await pay((await closed(to, 1_000)).id, 1_000);
    const last = await closed('15:00', 1_000);

    const one = await list(owner, '?limit=1');
    expect(rowsOf(one).map(({ id }) => id)).toEqual([first.id]);
    expect((one.body as { meta: unknown }).meta).toEqual({
      currentPage: 1,
      limit: 1,
      totalPages: 2,
      totalRecords: 2,
      hasNextPage: true,
      hasPreviousPage: false,
    });
    const two = await list(owner, '?page=2&limit=1');
    expect(rowsOf(two).map(({ id }) => id)).toEqual([last.id]);
  });

  it('answers the owner and reception; not_found to a stranger, an owner of another space and the admin', async () => {
    await closed('18:00', 2_000);
    for (const caller of [owner, reception]) {
      expect((await list(caller)).status).toBe(200);
    }
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await list(caller);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
  });
});
