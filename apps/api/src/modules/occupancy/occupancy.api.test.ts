import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createSpace } from '../../../test/factories.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { setWeek, signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

const app = createTestApp();
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

/** The capacity route of the space, as the caller. */
function capacity(caller: { authorization: string }, method: 'get' | 'put', body?: object) {
  const path = `/api/v1/manage/spaces/${String(spaceId)}/capacity`;
  const call = request(app)[method](path).set('Authorization', caller.authorization);
  return body ? call.send(body) : call;
}

/** The space's occupancy row, or null when it has none. */
function storedOccupancy() {
  return prisma.spaceOccupancy.findUnique({
    where: { spaceId },
    select: {
      capacity: true,
      stateOverride: true,
      stateOverrideUntil: true,
      stateOverrideById: true,
    },
  });
}

describe("a space's capacity", () => {
  it('answers the owner no capacity before one is set, and the capacity once it is', async () => {
    await prisma.spaceOccupancy.create({ data: { spaceId: otherSpaceId, capacity: 99 } });

    const none = await capacity(owner, 'get');
    expect(none.status).toBe(200);
    expect(dataOf(none)).toEqual({ capacity: null });

    await prisma.spaceOccupancy.create({ data: { spaceId, capacity: 30 } });
    const set = await capacity(owner, 'get');
    expect(set.status).toBe(200);
    expect(dataOf(set)).toEqual({ capacity: 30 });
  });

  it('answers not_found to a stranger, an owner of another space and an unlinked admin, on the read and the write, writing nothing', async () => {
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const read = await capacity(caller, 'get');
      expect(read.status).toBe(404);
      expect(errorOf(read).type).toBe('not_found');

      const write = await capacity(caller, 'put', { capacity: 30 });
      expect(write.status).toBe(404);
      expect(errorOf(write).type).toBe('not_found');
    }

    expect(await storedOccupancy()).toBeNull();
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses reception’s read and write with 403 before reading the body, writing nothing', async () => {
    const read = await capacity(reception, 'get');
    const invalid = await capacity(reception, 'put', { capacity: 0 });
    const valid = await capacity(reception, 'put', { capacity: 30 });

    for (const refused of [read, invalid, valid]) {
      expect(refused.status).toBe(403);
      expect(errorOf(refused).type).toBe('forbidden');
    }
    expect(await storedOccupancy()).toBeNull();
    expect(await auditEntries()).toEqual([]);
  });

  it("sets a first capacity, creating the space's occupancy row, and audits space.capacityEdited", async () => {
    const set = await capacity(owner, 'put', { capacity: 40 });

    expect(set.status).toBe(200);
    expect(dataOf(set)).toEqual({ capacity: 40 });
    expect(await storedOccupancy()).toEqual({
      capacity: 40,
      stateOverride: null,
      stateOverrideUntil: null,
      stateOverrideById: null,
    });
    expect(await auditEntries()).toEqual([
      {
        actorId: owner.id,
        action: 'space.capacityEdited',
        entityType: 'space',
        entityId: spaceId,
        spaceId,
        before: { capacity: null },
        after: { capacity: 40 },
      },
    ]);
  });

  it('changes and clears a capacity, keeping the row and its override', async () => {
    const until = new Date('2026-10-19T15:00:00Z');
    await prisma.spaceOccupancy.create({
      data: {
        spaceId,
        capacity: 30,
        stateOverride: 'FULL',
        stateOverrideUntil: until,
        stateOverrideById: owner.id,
      },
    });
    const override = {
      stateOverride: 'FULL',
      stateOverrideUntil: until,
      stateOverrideById: owner.id,
    };

    const changed = await capacity(owner, 'put', { capacity: 50 });
    expect(changed.status).toBe(200);
    expect(dataOf(changed)).toEqual({ capacity: 50 });
    expect(await storedOccupancy()).toEqual({ capacity: 50, ...override });

    const cleared = await capacity(owner, 'put', { capacity: null });
    expect(cleared.status).toBe(200);
    expect(dataOf(cleared)).toEqual({ capacity: null });
    expect(await storedOccupancy()).toEqual({ capacity: null, ...override });

    const entries = await auditEntries();
    expect(entries.map(({ action, before, after }) => ({ action, before, after }))).toEqual([
      { action: 'space.capacityEdited', before: { capacity: 30 }, after: { capacity: 50 } },
      { action: 'space.capacityEdited', before: { capacity: 50 }, after: { capacity: null } },
    ]);
  });

  it('setting the capacity keeps an override in force', async () => {
    const sundayAt10 = createTestApp({ clock: () => new Date('2026-10-18T10:00:00+03:00') });
    await setWeek(
      spaceId,
      Array.from({ length: 7 }, () => [8 * 60, 18 * 60] as [number, number]),
    );
    const path = `/api/v1/manage/spaces/${String(spaceId)}`;
    const overridden = await request(sundayAt10)
      .put(`${path}/status-override`)
      .set('Authorization', reception.authorization)
      .send({ state: 'FULL', duration: 'HOUR_1' });
    expect(overridden.status).toBe(200);

    const set = await request(sundayAt10)
      .put(`${path}/capacity`)
      .set('Authorization', owner.authorization)
      .send({ capacity: 40 });
    expect(set.status).toBe(200);

    const now = await request(sundayAt10)
      .get(`${path}/occupancy`)
      .set('Authorization', owner.authorization);
    expect(dataOf(now)).toMatchObject({
      status: 'FULL',
      capacity: 40,
      override: { state: 'FULL', until: '2026-10-18T08:00:00.000Z' },
    });
  });

  it('writes nothing for the capacity it already has, a null with no row included', async () => {
    const none = await capacity(owner, 'put', { capacity: null });
    expect(none.status).toBe(200);
    expect(dataOf(none)).toEqual({ capacity: null });
    expect(await storedOccupancy()).toBeNull();

    await prisma.spaceOccupancy.create({ data: { spaceId, capacity: 30 } });
    const { updatedAt } = await prisma.spaceOccupancy.findUniqueOrThrow({ where: { spaceId } });
    const same = await capacity(owner, 'put', { capacity: 30 });
    expect(same.status).toBe(200);
    expect(dataOf(same)).toEqual({ capacity: 30 });
    const stored = await prisma.spaceOccupancy.findUniqueOrThrow({ where: { spaceId } });
    expect(stored.updatedAt).toEqual(updatedAt);

    expect(await auditEntries()).toEqual([]);
  });

  it('refuses a capacity out of range or missing, on its field, writing nothing', async () => {
    const refusals = [
      [{ capacity: 0 }, { capacity: ['out_of_range'] }],
      [{ capacity: 1_001 }, { capacity: ['out_of_range'] }],
      [{}, { capacity: ['required'] }],
    ] as const;

    for (const [body, errors] of refusals) {
      const refused = await capacity(owner, 'put', body);
      expect(refused.status).toBe(422);
      expect(errorOf(refused).type).toBe('validation');
      expect(errorOf(refused).errors).toEqual(errors);
    }
    expect(await storedOccupancy()).toBeNull();
    expect(await auditEntries()).toEqual([]);
  });

  it('decides a write on the links under the space’s lock: an owner unlinked meanwhile is refused', async () => {
    const response = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`,
      () => capacity(owner, 'put', { capacity: 40 }),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: owner.id } },
          data: { deactivatedAt: new Date() },
        }),
    );

    expect(response.status).toBe(403);
    expect(errorOf(response).type).toBe('forbidden');
    expect(await storedOccupancy()).toBeNull();
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses a write to a space deleted while it waited for its lock, writing nothing', async () => {
    const response = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`,
      () => capacity(owner, 'put', { capacity: 40 }),
      (tx) => tx.space.update({ where: { id: spaceId }, data: { deletedAt: new Date() } }),
    );

    expect(response.status).toBe(404);
    expect(errorOf(response).type).toBe('not_found');
    expect(await storedOccupancy()).toBeNull();
    expect(await auditEntries()).toEqual([]);
  });
});
