import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createCustomer, createSpace } from '../../../test/factories.ts';
import { waitingOnLock, whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

const app = createTestApp({ clock: () => new Date('2026-10-21T10:00:00+03:00') });
const PHONE = '+970599000123';
const OTHER_PHONE = '+970599000456';

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

const customersPath = (space = spaceId) => `/api/v1/manage/spaces/${String(space)}/customers`;

/** Creates a customer as the caller, with this key (a new one unless given; `null` for none). */
function create(
  caller: { authorization: string },
  body: object,
  key: string | null = randomUUID(),
) {
  const call = request(app).post(customersPath()).set('Authorization', caller.authorization);
  return (key === null ? call : call.set('Idempotency-Key', key)).send(body);
}

function edit(caller: { authorization: string }, customerId: number, body: object) {
  return request(app)
    .patch(`${customersPath()}/${String(customerId)}`)
    .set('Authorization', caller.authorization)
    .send(body);
}

const storedCustomers = () =>
  prisma.customer.findMany({
    select: { id: true, spaceId: true, name: true, phone: true, idempotencyKey: true },
    orderBy: { id: 'asc' },
  });

const lockSpace = (tx: Pick<typeof prisma, '$queryRaw'>) =>
  tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;

describe('creating a customer', () => {
  it('the staff create a customer with a name and a phone, or a name alone, audited customer.created', async () => {
    const key = randomUUID();
    const withPhone = await create(reception, { name: ' سارة ', phone: '059-900-0123' }, key);
    expect(withPhone.status).toBe(201);
    const { id } = dataOf(withPhone) as { id: number };
    expect(dataOf(withPhone)).toEqual({ id, name: 'سارة', phone: PHONE, archivedAt: null });

    const nameOnly = await create(owner, { name: 'Omar' });
    expect(nameOnly.status).toBe(201);
    expect(dataOf(nameOnly)).toMatchObject({ name: 'Omar', phone: null, archivedAt: null });

    expect(await storedCustomers()).toEqual([
      { id, spaceId, name: 'سارة', phone: PHONE, idempotencyKey: key },
      expect.objectContaining({ name: 'Omar', phone: null }) as unknown,
    ]);
    expect(await auditEntries()).toEqual([
      {
        actorId: reception.id,
        action: 'customer.created',
        entityType: 'customer',
        entityId: id,
        spaceId,
        before: null,
        after: { name: 'سارة', phone: PHONE },
      },
      expect.objectContaining({ actorId: owner.id, action: 'customer.created' }) as unknown,
    ]);
  });

  it("a phone another customer holds is refused 409 PHONE_TAKEN on phone; an archived customer's phone is free", async () => {
    await createCustomer(spaceId, { phone: PHONE });

    const taken = await create(reception, { name: 'Omar', phone: PHONE });
    expect(taken.status).toBe(409);
    expect(errorOf(taken)).toMatchObject({
      code: 'PHONE_TAKEN',
      errors: { phone: ['not_unique'] },
    });
    expect(await storedCustomers()).toHaveLength(1);
    expect(await auditEntries()).toEqual([]);

    await prisma.customer.updateMany({ data: { archivedAt: new Date() } });
    const freed = await create(reception, { name: 'Omar', phone: PHONE });
    expect(freed.status).toBe(201);
    expect(dataOf(freed)).toMatchObject({ name: 'Omar', phone: PHONE });

    // Another space's customers never hold a phone here.
    await createCustomer(otherSpaceId, { phone: OTHER_PHONE });
    expect((await create(owner, { name: 'Lina', phone: OTHER_PHONE })).status).toBe(201);
  });

  it('a retry with the same key answers the first customer, 201, never a second', async () => {
    const key = randomUUID();
    const first = await create(reception, { name: 'Sara', phone: PHONE }, key);
    const retry = await create(reception, { name: 'Sara', phone: PHONE }, key);

    expect([first.status, retry.status]).toEqual([201, 201]);
    expect(dataOf(retry)).toEqual(dataOf(first));
    expect(await storedCustomers()).toHaveLength(1);
    expect(await auditEntries()).toHaveLength(1);
  });

  it('two requests with one key at once make one customer', async () => {
    const key = randomUUID();
    const pending: Promise<request.Response>[] = [];
    // Both wait on the space's lock, so the second reads what the first committed.
    await prisma.$transaction(async (tx) => {
      await lockSpace(tx);
      pending.push(
        Promise.resolve(create(owner, { name: 'Sara', phone: PHONE }, key)),
        Promise.resolve(create(reception, { name: 'Sara', phone: PHONE }, key)),
      );
      await waitingOnLock({ count: 2 });
    });

    const [first, second] = await Promise.all(pending);
    expect([first?.status, second?.status]).toEqual([201, 201]);
    expect(dataOf(second as request.Response)).toEqual(dataOf(first as request.Response));
    expect(await storedCustomers()).toHaveLength(1);
  });

  it('refuses a missing or invalid key, and an invalid body, with 422 before anything is read', async () => {
    const missing = await create(owner, { name: '' }, null);
    expect(missing.status).toBe(422);
    expect(errorOf(missing).errors).toEqual({ idempotencyKey: ['required'] });

    const malformed = await create(owner, { name: 'Sara' }, 'not-a-uuid');
    expect(malformed.status).toBe(422);
    expect(errorOf(malformed).errors).toEqual({ idempotencyKey: ['invalid_format'] });

    const invalid = await create(owner, { name: '', phone: '123' });
    expect(invalid.status).toBe(422);
    expect(errorOf(invalid).errors).toEqual({ name: ['too_short'], phone: ['invalid_format'] });
    expect(await storedCustomers()).toEqual([]);
  });

  it("a reception link ended while the create waits on the space's lock is refused 403, writing nothing", async () => {
    const response = await whileHeld(
      lockSpace,
      () => create(reception, { name: 'Sara' }),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: reception.id } },
          data: { deactivatedAt: new Date() },
        }),
    );

    expect(response.status).toBe(403);
    expect(await storedCustomers()).toEqual([]);
    expect(await auditEntries()).toEqual([]);
  });
});

describe('editing a customer', () => {
  it('owner and reception edit the name and the phone, audited customer.edited with only what changed; the same values write nothing', async () => {
    const { id } = await createCustomer(spaceId, { name: 'Sara', phone: PHONE });

    const byReception = await edit(reception, id, { name: 'Sara Ali', phone: PHONE });
    expect(byReception.status).toBe(200);
    expect(dataOf(byReception)).toEqual({ id, name: 'Sara Ali', phone: PHONE, archivedAt: null });

    const byOwner = await edit(owner, id, { phone: '0599000456' });
    expect(byOwner.status).toBe(200);
    expect(dataOf(byOwner)).toMatchObject({ name: 'Sara Ali', phone: OTHER_PHONE });

    const unchanged = await edit(owner, id, { name: 'Sara Ali', phone: OTHER_PHONE });
    expect(unchanged.status).toBe(200);
    expect(dataOf(unchanged)).toEqual(dataOf(byOwner));

    expect(await auditEntries()).toEqual([
      {
        actorId: reception.id,
        action: 'customer.edited',
        entityType: 'customer',
        entityId: id,
        spaceId,
        before: { name: 'Sara' },
        after: { name: 'Sara Ali' },
      },
      {
        actorId: owner.id,
        action: 'customer.edited',
        entityType: 'customer',
        entityId: id,
        spaceId,
        before: { phone: PHONE },
        after: { phone: OTHER_PHONE },
      },
    ]);
  });

  it('a phone another customer holds is PHONE_TAKEN, writing nothing; clearing the phone is allowed', async () => {
    const { id } = await createCustomer(spaceId, { name: 'Sara', phone: PHONE });
    await createCustomer(spaceId, { name: 'Omar', phone: OTHER_PHONE });

    const taken = await edit(reception, id, { phone: OTHER_PHONE });
    expect(taken.status).toBe(409);
    expect(errorOf(taken)).toMatchObject({
      code: 'PHONE_TAKEN',
      errors: { phone: ['not_unique'] },
    });
    expect(await prisma.customer.findUniqueOrThrow({ where: { id } })).toMatchObject({
      phone: PHONE,
    });

    const cleared = await edit(reception, id, { phone: null });
    expect(cleared.status).toBe(200);
    expect(dataOf(cleared)).toMatchObject({ phone: null });
    expect((await auditEntries()).map(({ after }) => after)).toEqual([{ phone: null }]);
  });

  it("refuses an invalid body with 422; another space's customer, or none, is not_found", async () => {
    const { id } = await createCustomer(spaceId);
    const theirs = await createCustomer(otherSpaceId);

    const invalid = await edit(owner, id, { name: '' });
    expect(invalid.status).toBe(422);
    expect(errorOf(invalid).errors).toEqual({ name: ['too_short'] });
    for (const customerId of [theirs.id, 999_999]) {
      const response = await edit(owner, customerId, { name: 'Omar' });
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    expect(await auditEntries()).toEqual([]);
  });
});

describe('restoring a customer', () => {
  const restore = (caller: { authorization: string }, customerId: number) =>
    request(app)
      .post(`${customersPath()}/${String(customerId)}/restore`)
      .set('Authorization', caller.authorization);

  it('the owner restores an archived customer, audited customer.restored; one not archived answers as it is', async () => {
    const { id } = await createCustomer(spaceId, {
      name: 'Sara',
      phone: PHONE,
      archivedAt: new Date('2026-10-20T09:00:00+03:00'),
    });

    const restored = await restore(owner, id);
    expect(restored.status).toBe(200);
    expect(dataOf(restored)).toEqual({ id, name: 'Sara', phone: PHONE, archivedAt: null });
    const again = await restore(owner, id);
    expect(again.status).toBe(200);
    expect(dataOf(again)).toEqual(dataOf(restored));
    expect(await auditEntries()).toEqual([
      {
        actorId: owner.id,
        action: 'customer.restored',
        entityType: 'customer',
        entityId: id,
        spaceId,
        before: { archivedAt: '2026-10-20T06:00:00.000Z' },
        after: null,
      },
    ]);
  });

  it('reception is refused 403 before anything is read; a phone another customer now holds is PHONE_TAKEN', async () => {
    const { id } = await createCustomer(spaceId, { phone: PHONE, archivedAt: new Date() });

    // Answered while the space's lock is held: refused at the route, before the service reads.
    const byReception = await prisma.$transaction(
      async (tx) => {
        await lockSpace(tx);
        return restore(reception, id);
      },
      { timeout: 3_000 },
    );
    expect(byReception.status).toBe(403);
    expect(errorOf(byReception).type).toBe('forbidden');

    await createCustomer(spaceId, { name: 'Omar', phone: PHONE });
    const taken = await restore(owner, id);
    expect(taken.status).toBe(409);
    expect(errorOf(taken)).toMatchObject({
      code: 'PHONE_TAKEN',
      errors: { phone: ['not_unique'] },
    });
    expect(await prisma.customer.findUniqueOrThrow({ where: { id } })).toMatchObject({
      archivedAt: expect.any(Date) as Date,
    });
    expect(await auditEntries()).toEqual([]);
  });
});

describe("the customers' routes", () => {
  it("answer not_found to a stranger, another space's owner and the admin, on every route", async () => {
    const { id } = await createCustomer(spaceId, { name: 'Sara' });

    for (const caller of [stranger, unrelatedOwner, admin]) {
      for (const response of [
        await create(caller, { name: 'Omar' }),
        await edit(caller, id, { name: 'Omar' }),
        await request(app)
          .post(`${customersPath()}/${String(id)}/restore`)
          .set('Authorization', caller.authorization),
      ]) {
        expect(response.status).toBe(404);
        expect(errorOf(response).type).toBe('not_found');
      }
    }
    expect(await storedCustomers()).toHaveLength(1);
    expect(await auditEntries()).toEqual([]);
  });
});
