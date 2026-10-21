import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createSpace, createVisit, stay } from '../../../test/factories.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

const app = createTestApp({ clock: () => new Date('2026-10-18T10:20:00+03:00') });
const REASON = 'Left without paying';

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

/** A visit of the space closed on 17 Oct at 18:00, by the auto check-out unless told, with this charge. */
function closed(
  chargeAgorot: number | null,
  {
    checkoutMethod = 'AUTO',
    space = spaceId,
  }: { checkoutMethod?: 'AUTO' | 'MANUAL'; space?: number } = {},
) {
  return createVisit(space, {
    ...stay('2026-10-17', '09:00', '18:00'),
    checkoutMethod,
    chargeAgorot,
  });
}

/** A payment of the visit, by the owner, through the given client (a test transaction or not). */
function pay(
  visitId: number,
  amountAgorot: number,
  client: Pick<typeof prisma, 'payment'> = prisma,
) {
  return client.payment.create({
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

const path = (visitId: number) =>
  `/api/v1/manage/spaces/${String(spaceId)}/visits/${String(visitId)}/write-off`;

function writeOff(
  caller: { authorization: string },
  visitId: number,
  body: object = { reason: REASON },
) {
  return request(app).post(path(visitId)).set('Authorization', caller.authorization).send(body);
}

function undo(caller: { authorization: string }, visitId: number) {
  return request(app).delete(path(visitId)).set('Authorization', caller.authorization);
}

async function uncollectedIds() {
  const response = await request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/uncollected-visits`)
    .set('Authorization', owner.authorization);
  expect(response.status).toBe(200);
  return (dataOf(response) as { visit: { id: number } }[]).map(({ visit }) => visit.id);
}

const stored = (id: number) => prisma.visit.findUniqueOrThrow({ where: { id } });
const NOT_WRITTEN_OFF = { writtenOffAt: null, writtenOffById: null, writeOffReason: null };
const lockSpace = (tx: Pick<typeof prisma, '$queryRaw'>) =>
  tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;

describe("writing a visit's debt off", () => {
  it("the owner writes off an uncollected visit's balance with a reason: answered with its write-off, gone from the uncollected visits, audited visit.writtenOff", async () => {
    const { id } = await closed(2_500);
    expect(await uncollectedIds()).toEqual([id]);

    const response = await writeOff(owner, id);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      id,
      checkoutMethod: 'AUTO',
      charge: { amountAgorot: 2_500 },
      writeOff: { at: '2026-10-18T07:20:00.000Z', byId: owner.id, reason: REASON },
    });
    expect(await stored(id)).toMatchObject({
      writtenOffAt: new Date('2026-10-18T10:20:00+03:00'),
      writtenOffById: owner.id,
      writeOffReason: REASON,
    });
    expect(await uncollectedIds()).toEqual([]);
    expect(await auditEntries()).toEqual([
      {
        actorId: owner.id,
        action: 'visit.writtenOff',
        entityType: 'visit',
        entityId: id,
        spaceId,
        before: null,
        after: { reason: REASON, balanceAgorot: 2_500 },
      },
    ]);
  });

  it('a partly paid visit has only its remainder written off; its payments stay', async () => {
    const { id } = await closed(2_500);
    const payment = await pay(id, 1_000);

    expect((await writeOff(owner, id)).status).toBe(200);
    expect((await auditEntries())[0]?.after).toEqual({ reason: REASON, balanceAgorot: 1_500 });
    expect(await prisma.payment.findMany()).toEqual([payment]);
  });

  it("a customer's unpaid visit from a manual check-out is written off too", async () => {
    const { id } = await closed(2_500, { checkoutMethod: 'MANUAL' });

    const response = await writeOff(owner, id);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      checkoutMethod: 'MANUAL',
      writeOff: { reason: REASON },
    });
  });

  it("refuses reception with 403 before the body is read; a stranger, another space's owner and the admin with not_found", async () => {
    const { id } = await closed(2_500);

    const byReception = await writeOff(reception, id, {});
    expect(byReception.status).toBe(403);
    expect(errorOf(byReception).type).toBe('forbidden');
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await writeOff(caller, id);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }

    const theirs = await closed(2_500, { space: otherSpaceId });
    expect((await writeOff(owner, theirs.id)).status).toBe(404);
    expect(await stored(theirs.id)).toMatchObject(NOT_WRITTEN_OFF);
    expect(await stored(id)).toMatchObject(NOT_WRITTEN_OFF);
    expect(await auditEntries()).toEqual([]);
  });

  it("an owner whose link ended while the write-off waited on the space's lock is refused 403, writing nothing", async () => {
    const { id } = await closed(2_500);

    const response = await whileHeld(
      lockSpace,
      () => writeOff(owner, id),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: owner.id } },
          data: { deactivatedAt: new Date() },
        }),
    );
    expect(response.status).toBe(403);
    expect(await stored(id)).toMatchObject(NOT_WRITTEN_OFF);
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses an unpriced visit (409 VISIT_NOT_PRICED), an open one (409), a paid one (409 VISIT_ALREADY_PAID), writing nothing', async () => {
    const unpriced = await closed(null);
    const open = await createVisit(spaceId, { checkedInAt: new Date('2026-10-18T09:00:00+03:00') });
    const paid = await closed(2_000);
    await pay(paid.id, 2_000);

    const notPriced = await writeOff(owner, unpriced.id);
    expect(notPriced.status).toBe(409);
    expect(errorOf(notPriced).code).toBe('VISIT_NOT_PRICED');
    const stillOpen = await writeOff(owner, open.id);
    expect(stillOpen.status).toBe(409);
    expect(errorOf(stillOpen)).toMatchObject({ type: 'conflict' });
    expect(errorOf(stillOpen).code).toBeUndefined();
    const settled = await writeOff(owner, paid.id);
    expect(settled.status).toBe(409);
    expect(errorOf(settled).code).toBe('VISIT_ALREADY_PAID');

    for (const { id } of [unpriced, open, paid]) {
      expect(await stored(id)).toMatchObject(NOT_WRITTEN_OFF);
    }
    expect(await auditEntries()).toEqual([]);
  });

  it('a second write-off answers the visit as it is: the first reason kept, nothing audited', async () => {
    const { id } = await closed(2_500);
    await writeOff(owner, id);

    const again = await writeOff(owner, id, { reason: 'Another reason' });
    expect(again.status).toBe(200);
    expect(dataOf(again)).toMatchObject({ writeOff: { reason: REASON } });
    expect(await stored(id)).toMatchObject({ writeOffReason: REASON });
    expect((await auditEntries()).map(({ action }) => action)).toEqual(['visit.writtenOff']);
  });

  it('refuses a missing or blank reason with 422 before anything is read', async () => {
    const { id } = await closed(2_500);

    const missing = await writeOff(owner, id, {});
    expect(missing.status).toBe(422);
    expect(errorOf(missing).errors).toEqual({ reason: ['required'] });
    const blank = await writeOff(owner, id, { reason: '   ' });
    expect(blank.status).toBe(422);
    expect(errorOf(blank).errors).toEqual({ reason: ['too_short'] });
    expect(await stored(id)).toMatchObject(NOT_WRITTEN_OFF);
  });

  it('a payment committed while the write-off waits: only the rest is written off; a full one refuses it VISIT_ALREADY_PAID', async () => {
    const part = await closed(2_500);
    const partly = await whileHeld(
      lockSpace,
      () => writeOff(owner, part.id),
      (tx) => pay(part.id, 1_000, tx),
    );
    expect(partly.status).toBe(200);
    expect((await auditEntries())[0]?.after).toEqual({ reason: REASON, balanceAgorot: 1_500 });

    const whole = await closed(2_500);
    const settled = await whileHeld(
      lockSpace,
      () => writeOff(owner, whole.id),
      (tx) => pay(whole.id, 2_500, tx),
    );
    expect(settled.status).toBe(409);
    expect(errorOf(settled).code).toBe('VISIT_ALREADY_PAID');
    expect(await stored(whole.id)).toMatchObject(NOT_WRITTEN_OFF);
  });
});

describe('undoing a write-off', () => {
  it('the owner undoes a write-off: cleared, uncollected again, audited visit.writeOffUndone with what it was', async () => {
    const { id } = await closed(2_500);
    await writeOff(owner, id);

    const response = await undo(owner, id);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({ id, writeOff: null });
    expect(await stored(id)).toMatchObject(NOT_WRITTEN_OFF);
    expect(await uncollectedIds()).toEqual([id]);
    expect((await auditEntries())[1]).toEqual({
      actorId: owner.id,
      action: 'visit.writeOffUndone',
      entityType: 'visit',
      entityId: id,
      spaceId,
      before: {
        writtenOffAt: '2026-10-18T07:20:00.000Z',
        writtenOffById: owner.id,
        reason: REASON,
      },
      after: null,
    });
  });

  it('undoing a visit not written off answers it as it is, writing nothing', async () => {
    const { id } = await closed(2_500);

    const response = await undo(owner, id);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({ id, writeOff: null });
    expect(await auditEntries()).toEqual([]);
  });

  it("refuses a stranger, another space's owner and the admin with not_found; another space's visit is not_found", async () => {
    const { id } = await closed(2_500);
    await writeOff(owner, id);
    const theirs = await closed(2_500, { space: otherSpaceId });
    await prisma.visit.update({
      where: { id: theirs.id },
      data: { writtenOffAt: new Date(), writtenOffById: unrelatedOwner.id, writeOffReason: REASON },
    });
    const audited = await auditEntries();

    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await undo(caller, id);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    const response = await undo(owner, theirs.id);
    expect(response.status).toBe(404);
    expect(errorOf(response).type).toBe('not_found');
    expect(await stored(id)).toMatchObject({ writeOffReason: REASON });
    expect(await stored(theirs.id)).toMatchObject({ writeOffReason: REASON });
    expect(await auditEntries()).toEqual(audited);
  });

  it("an owner whose link ended while the undo waited on the space's lock is refused 403, writing nothing", async () => {
    const { id } = await closed(2_500);
    await writeOff(owner, id);
    const audited = await auditEntries();

    const response = await whileHeld(
      lockSpace,
      () => undo(owner, id),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: owner.id } },
          data: { deactivatedAt: new Date() },
        }),
    );
    expect(response.status).toBe(403);
    expect(await stored(id)).toMatchObject({ writeOffReason: REASON });
    expect(await auditEntries()).toEqual(audited);
  });

  it("reception may not undo (403); the space's other routes still answer it", async () => {
    const { id } = await closed(2_500);
    await writeOff(owner, id);

    const response = await undo(reception, id);
    expect(response.status).toBe(403);
    expect(await stored(id)).toMatchObject({ writeOffReason: REASON });
    const listed = await request(app)
      .get(`/api/v1/manage/spaces/${String(spaceId)}/uncollected-visits`)
      .set('Authorization', reception.authorization);
    expect(listed.status).toBe(200);
  });
});
