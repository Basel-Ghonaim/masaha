import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createSpace, createVisit, stay } from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// The space's written-off visits (docs/api/api-contract.md › Front desk (managed)), the owner's.
const app = createTestApp({ clock: () => new Date('2026-10-18T10:20:00+03:00') });

let spaceId: number;
let otherSpaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };
let stranger: { id: number; authorization: string };
let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  stranger = await signIn('USER', 'stranger@example.com');
  ({ id: otherSpaceId } = await createSpace('other-space'));
  admin = await signIn('ADMIN');
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
});

/** A visit of the space closed by the auto check-out on 17 Oct, with this charge. */
function closed(chargeAgorot: number, space = spaceId) {
  return createVisit(space, {
    ...stay('2026-10-17', '09:00', '12:00'),
    checkoutMethod: 'AUTO',
    chargeAgorot,
  });
}

/** A payment of the visit by the owner; voided by the owner when told. */
async function pay(visitId: number, amountAgorot: number, { voided = false } = {}) {
  const payment = await prisma.payment.create({
    data: {
      spaceId,
      visitId,
      idempotencyKey: randomUUID(),
      recordedById: owner.id,
      method: 'CASH',
      amountAgorot,
    },
  });
  if (voided) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { voidedAt: new Date(), voidedById: owner.id, voidReason: 'Twice' },
    });
  }
}

/** Writes the visit off at this Gaza time on 17 Oct, by the owner. */
function writeOff(visitId: number, time: string, reason: string) {
  return prisma.visit.update({
    where: { id: visitId },
    data: {
      writtenOffAt: new Date(`2026-10-17T${time}:00+03:00`),
      writtenOffById: owner.id,
      writeOffReason: reason,
    },
  });
}

function list(caller: { authorization: string }, query = '') {
  return request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/written-off-visits${query}`)
    .set('Authorization', caller.authorization);
}

describe("the space's written-off visits", () => {
  it('the written-off list names who wrote off, the amount and the reason, newest first', async () => {
    const older = await closed(3_000);
    await pay(older.id, 1_000);
    // A voided payment pays nothing: the rest written off counts without it.
    await pay(older.id, 500, { voided: true });
    await writeOff(older.id, '12:00', 'Left without paying');
    const newer = await closed(2_000);
    await writeOff(newer.id, '15:00', 'A regular, forgiven');
    // Not written off, or another space's: absent.
    await closed(1_500);
    const theirs = await closed(1_000, otherSpaceId);
    await writeOff(theirs.id, '16:00', 'Theirs');

    const response = await list(owner);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toEqual([
      {
        visit: expect.objectContaining({
          id: newer.id,
          writeOff: {
            at: '2026-10-17T12:00:00.000Z',
            byId: owner.id,
            reason: 'A regular, forgiven',
          },
        }) as unknown,
        writtenOffBy: { id: owner.id, name: 'Ahmad' },
        paidAgorot: 0,
        writtenOffAgorot: 2_000,
      },
      {
        visit: expect.objectContaining({
          id: older.id,
          writeOff: {
            at: '2026-10-17T09:00:00.000Z',
            byId: owner.id,
            reason: 'Left without paying',
          },
        }) as unknown,
        writtenOffBy: { id: owner.id, name: 'Ahmad' },
        paidAgorot: 1_000,
        writtenOffAgorot: 2_000,
      },
    ]);
    expect((response.body as { meta: object }).meta).toEqual({
      currentPage: 1,
      limit: 20,
      totalPages: 1,
      totalRecords: 2,
      hasNextPage: false,
      hasPreviousPage: false,
    });
    const second = await list(owner, '?limit=1&page=2');
    expect((dataOf(second) as { visit: { id: number } }[]).map(({ visit }) => visit.id)).toEqual([
      older.id,
    ]);
  });

  it('reception is refused the written-off list before the query; a stranger and the admin not_found', async () => {
    const response = await list(reception);
    expect(response.status).toBe(403);
    expect(errorOf(response).type).toBe('forbidden');
    for (const caller of [stranger, admin]) {
      expect((await list(caller)).status).toBe(404);
    }
    expect((await list(owner, '?limit=0')).status).toBe(422);
  });
});
