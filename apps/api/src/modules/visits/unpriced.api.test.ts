import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createSpace, createVisit, stay } from '../../../test/factories.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';
import { createVisitsRepository } from './visits.repository.ts';

const app = createTestApp({ clock: () => new Date('2026-10-18T10:20:00+03:00') });
const REASON = 'No evening price';

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
  reception = await signIn('USER', 'reception@example.com');
  stranger = await signIn('USER', 'stranger@example.com');
  ({ id: otherSpaceId } = await createSpace('other-space'));
  unrelatedOwner = await signInOwnerOf(otherSpaceId);
  admin = await signIn('ADMIN');
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
});

/** A visit closed with no charge, by the desk unless told, on this day and times. */
const unpriced = (
  day: string,
  from: string,
  to: string,
  checkoutMethod: 'MANUAL' | 'AUTO' = 'MANUAL',
) => createVisit(spaceId, { ...stay(day, from, to), checkoutMethod });

function list(caller: { authorization: string }, query = '') {
  return request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/unpriced-visits${query}`)
    .set('Authorization', caller.authorization);
}

function price(caller: { authorization: string }, visitId: number, body: object) {
  return request(app)
    .put(`/api/v1/manage/spaces/${String(spaceId)}/visits/${String(visitId)}/charge`)
    .set('Authorization', caller.authorization)
    .send(body);
}

const stored = (id: number) => prisma.visit.findUniqueOrThrow({ where: { id } });

describe('the unpriced visits', () => {
  it('lists the closed visits with no charge, paged, newest first, to the owner and reception', async () => {
    const older = await unpriced('2026-10-16', '09:00', '12:00');
    const newer = await unpriced('2026-10-17', '09:00', '18:00', 'AUTO');
    const newest = await unpriced('2026-10-17', '10:00', '19:00');
    await createVisit(spaceId, { ...stay('2026-10-17', '09:00', '20:00'), chargeAgorot: 1_000 });
    await createVisit(spaceId, { checkedInAt: new Date('2026-10-18T09:00:00+03:00') });
    await createVisit(otherSpaceId, stay('2026-10-17', '09:00', '21:00'));

    for (const caller of [owner, reception]) {
      const response = await list(caller);
      expect(response.status).toBe(200);
      expect((dataOf(response) as { id: number }[]).map(({ id }) => id)).toEqual([
        newest.id,
        newer.id,
        older.id,
      ]);
    }

    const page = await list(owner, '?page=2&limit=2');
    expect((dataOf(page) as { id: number }[]).map(({ id }) => id)).toEqual([older.id]);
    expect((page.body as { meta: unknown }).meta).toEqual({
      currentPage: 2,
      limit: 2,
      totalPages: 2,
      totalRecords: 3,
      hasNextPage: false,
      hasPreviousPage: true,
    });
    expect((dataOf(page) as object[])[0]).toEqual({
      id: older.id,
      visitorName: 'Omar',
      customer: null,
      audience: 'GENERAL',
      shiftId: null,
      hourRateAgorot: null,
      dayRateAgorot: null,
      checkedInAt: '2026-10-16T06:00:00.000Z',
      checkedOutAt: '2026-10-16T09:00:00.000Z',
      checkoutMethod: 'MANUAL',
      charge: null,
      writeOff: null,
    });
  });

  it('the owner prices one with a reason: recorded with who typed it, audited visit.priced', async () => {
    const { id } = await unpriced('2026-10-17', '09:00', '12:00');

    const response = await price(owner, id, { amountAgorot: 1_500, reason: REASON });
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      id,
      charge: {
        amountAgorot: 1_500,
        roundingRule: null,
        roundingMinutes: null,
        capApplied: null,
        typedById: owner.id,
        reason: REASON,
      },
    });
    expect(await stored(id)).toMatchObject({
      chargeAgorot: 1_500,
      chargeSetById: owner.id,
      chargeReason: REASON,
    });
    expect(await auditEntries()).toEqual([
      {
        actorId: owner.id,
        action: 'visit.priced',
        entityType: 'visit',
        entityId: id,
        spaceId,
        before: null,
        after: { chargeAgorot: 1_500, reason: REASON },
      },
    ]);
    expect(dataOf(await list(owner))).toEqual([]);
  });

  it('reception prices one only where the space allows it (403 PRICE_TYPING_NOT_ALLOWED)', async () => {
    const { id } = await unpriced('2026-10-17', '09:00', '12:00');
    const body = { amountAgorot: 1_500, reason: REASON };

    const refused = await price(reception, id, body);
    expect(refused.status).toBe(403);
    expect(errorOf(refused).code).toBe('PRICE_TYPING_NOT_ALLOWED');
    expect(await stored(id)).toMatchObject({ chargeAgorot: null });

    await prisma.spaceSettings.update({
      where: { spaceId },
      data: { receptionMayTypePrices: true },
    });
    const allowed = await price(reception, id, body);
    expect(allowed.status).toBe(200);
    expect(await stored(id)).toMatchObject({ chargeAgorot: 1_500, chargeSetById: reception.id });
  });

  it('a priced visit is refused with 409 VISIT_ALREADY_PRICED; an open one with 409', async () => {
    const priced = await createVisit(spaceId, {
      ...stay('2026-10-17', '09:00', '12:00'),
      chargeAgorot: 1_000,
    });
    const open = await createVisit(spaceId, {
      checkedInAt: new Date('2026-10-18T09:00:00+03:00'),
    });
    const body = { amountAgorot: 1_500, reason: REASON };

    const already = await price(owner, priced.id, body);
    expect(already.status).toBe(409);
    expect(errorOf(already).code).toBe('VISIT_ALREADY_PRICED');
    expect(await stored(priced.id)).toMatchObject({ chargeAgorot: 1_000, chargeSetById: null });

    const stillOpen = await price(owner, open.id, body);
    expect(stillOpen.status).toBe(409);
    expect(errorOf(stillOpen)).toMatchObject({ type: 'conflict' });
    expect(errorOf(stillOpen).code).toBeUndefined();
    expect(await stored(open.id)).toMatchObject({ checkedOutAt: null, chargeAgorot: null });
    expect(await auditEntries()).toEqual([]);
  });

  it("refuses a stranger, an owner of another space and the admin with not_found; another space's visit is not_found", async () => {
    const { id } = await unpriced('2026-10-17', '09:00', '12:00');
    for (const caller of [stranger, unrelatedOwner, admin]) {
      expect((await list(caller)).status).toBe(404);
      const response = await price(caller, id, { amountAgorot: 1_500, reason: REASON });
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }

    const theirs = await createVisit(otherSpaceId, stay('2026-10-17', '09:00', '12:00'));
    const response = await price(owner, theirs.id, { amountAgorot: 1_500, reason: REASON });
    expect(response.status).toBe(404);
    expect(await stored(theirs.id)).toMatchObject({ chargeAgorot: null });
    expect(await stored(id)).toMatchObject({ chargeAgorot: null });
  });

  it('refuses an invalid body with 422 before anything is written', async () => {
    const { id } = await unpriced('2026-10-17', '09:00', '12:00');

    const response = await price(owner, id, { amountAgorot: 0 });
    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({
      amountAgorot: ['out_of_range'],
      reason: ['required'],
    });
    expect(await stored(id)).toMatchObject({ chargeAgorot: null });
  });

  it("a link deactivated while the pricing waits on the space's lock refuses it with 403", async () => {
    await prisma.spaceSettings.update({
      where: { spaceId },
      data: { receptionMayTypePrices: true },
    });
    const { id } = await unpriced('2026-10-17', '09:00', '12:00');

    const response = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`,
      () => price(reception, id, { amountAgorot: 1_500, reason: REASON }),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: reception.id } },
          data: { deactivatedAt: new Date() },
        }),
    );

    expect(response.status).toBe(403);
    expect(errorOf(response).type).toBe('forbidden');
    expect(await stored(id)).toMatchObject({ chargeAgorot: null });
  });
});

describe('the unpriced visits, counted', () => {
  it('unpricedCount equals the unpriced list’s total', async () => {
    await unpriced('2026-10-16', '09:00', '12:00');
    await unpriced('2026-10-17', '09:00', '18:00', 'AUTO');
    await createVisit(spaceId, { ...stay('2026-10-17', '09:00', '20:00'), chargeAgorot: 1_000 });
    await createVisit(spaceId, { checkedInAt: new Date('2026-10-18T09:00:00+03:00') });
    await createVisit(otherSpaceId, stay('2026-10-17', '09:00', '21:00'));

    const count = await createVisitsRepository().unpricedCount(spaceId);
    expect(count).toBe(2);
    const listed = await list(owner);
    expect((listed.body as { meta: { totalRecords: number } }).meta.totalRecords).toBe(count);
  });
});
