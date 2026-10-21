import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import {
  createCheckIn,
  createCustomer,
  createSpace,
  createSubscription,
  createVisit,
  stay,
} from '../../../test/factories.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

const app = createTestApp({ clock: () => new Date('2026-10-21T10:00:00+03:00') });
const ARCHIVED_AT = '2026-10-21T07:00:00.000Z';

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

const customerPath = (customerId: number) =>
  `/api/v1/manage/spaces/${String(spaceId)}/customers/${String(customerId)}`;

function archive(caller: { authorization: string }, customerId: number) {
  return request(app)
    .post(`${customerPath(customerId)}/archive`)
    .set('Authorization', caller.authorization);
}

const stored = (id: number) => prisma.customer.findUniqueOrThrow({ where: { id } });

describe('archiving a customer', () => {
  it('the owner archives a customer, audited customer.archived; again answers it as it is', async () => {
    const { id } = await createCustomer(spaceId, { name: 'Sara', phone: '+970599000123' });

    const archived = await archive(owner, id);
    expect(archived.status).toBe(200);
    expect(dataOf(archived)).toEqual({
      id,
      name: 'Sara',
      phone: '+970599000123',
      archivedAt: ARCHIVED_AT,
    });
    const again = await archive(owner, id);
    expect(again.status).toBe(200);
    expect(dataOf(again)).toEqual(dataOf(archived));
    expect(await auditEntries()).toEqual([
      {
        actorId: owner.id,
        action: 'customer.archived',
        entityType: 'customer',
        entityId: id,
        spaceId,
        before: null,
        after: { archivedAt: ARCHIVED_AT },
      },
    ]);
  });

  it('an owing customer is archived; one present by a check-in or a visit is refused MEMBER_ALREADY_CHECKED_IN', async () => {
    const owing = await createCustomer(spaceId, { name: 'Owes' });
    await createVisit(spaceId, {
      ...stay('2026-10-20', '09:00', '12:00'),
      customerId: owing.id,
      chargeAgorot: 1_500,
    });
    expect((await archive(owner, owing.id)).status).toBe(200);

    const subscriber = await createCustomer(spaceId, { name: 'Checked in' });
    await createCheckIn(await createSubscription(subscriber), {
      checkedInAt: new Date('2026-10-21T08:00:00+03:00'),
    });
    const visitor = await createCustomer(spaceId, { name: 'Visiting' });
    await createVisit(spaceId, {
      checkedInAt: new Date('2026-10-21T08:30:00+03:00'),
      customerId: visitor.id,
    });
    for (const { id } of [subscriber, visitor]) {
      const response = await archive(owner, id);
      expect(response.status).toBe(409);
      expect(errorOf(response).code).toBe('MEMBER_ALREADY_CHECKED_IN');
      expect(await stored(id)).toMatchObject({ archivedAt: null });
    }
    expect((await auditEntries()).map(({ entityId }) => entityId)).toEqual([owing.id]);
  });

  it("reception is refused 403 before anything is read; a stranger, another space's owner and the admin with not_found", async () => {
    const { id } = await createCustomer(spaceId);
    const theirs = await createCustomer(otherSpaceId);

    const byReception = await archive(reception, 999_999);
    expect(byReception.status).toBe(403);
    expect(errorOf(byReception).type).toBe('forbidden');
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await archive(caller, id);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    expect((await archive(owner, theirs.id)).status).toBe(404);
    expect(await stored(id)).toMatchObject({ archivedAt: null });
    expect(await stored(theirs.id)).toMatchObject({ archivedAt: null });
    expect(await auditEntries()).toEqual([]);
  });

  it("an archived customer's edit is refused CUSTOMER_ARCHIVED, writing nothing", async () => {
    const { id } = await createCustomer(spaceId, { name: 'Sara', archivedAt: new Date() });

    const response = await request(app)
      .patch(customerPath(id))
      .set('Authorization', reception.authorization)
      .send({ name: 'Sara Ali' });
    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('CUSTOMER_ARCHIVED');
    expect(await stored(id)).toMatchObject({ name: 'Sara' });
    expect(await auditEntries()).toEqual([]);
  });

  it("an owner whose link ended while the archive waited on the space's lock is refused 403", async () => {
    const { id } = await createCustomer(spaceId);

    const response = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`,
      () => archive(owner, id),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: owner.id } },
          data: { deactivatedAt: new Date() },
        }),
    );
    expect(response.status).toBe(403);
    expect(await stored(id)).toMatchObject({ archivedAt: null });
    expect(await auditEntries()).toEqual([]);
  });
});
