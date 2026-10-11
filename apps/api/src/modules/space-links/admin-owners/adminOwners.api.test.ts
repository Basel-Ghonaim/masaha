import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  adminRequest,
  auditEntries,
  dataOf,
  errorOf,
  REFUSED_CALLERS,
  signIn,
} from '../../../../test/admin.ts';
import { createTestApp } from '../../../../test/app.ts';
import { createSpace } from '../../../../test/factories.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { seedSettings } from '../../../../test/spaces.ts';
import { prisma, type Tx } from '../../../db/index.ts';
import type { Role } from '../../../generated/prisma/enums.ts';

const NOW = new Date('2026-10-11T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });

let admin: { id: number; authorization: string };
let spaceId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  admin = await signIn('ADMIN');
  ({ id: spaceId } = await createSpace('focus-hub'));
});

let people = 0;

/** An account with this role, and its email from its name. */
function person(role: Role = 'USER', { suspended = false } = {}) {
  people += 1;
  return prisma.user.create({
    data: {
      email: `person-${String(people)}@example.com`,
      name: 'Nour',
      role,
      passwordHash: 'x',
      suspendedAt: suspended ? NOW : null,
    },
  });
}

/** A signed-in session of the user: a refresh token, written with `tx` if given. */
async function session(userId: number, tx: Tx = prisma) {
  return tx.refreshToken.create({
    data: { userId, familyId: 1, tokenHash: randomUUID(), expiresAt: new Date('2026-10-18') },
  });
}

/** The user's sessions still alive. */
const sessions = (userId: number) => prisma.refreshToken.count({ where: { userId } });

const role = async (userId: number) =>
  (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).role;

const verified = async (id = spaceId) => {
  const response = await adminRequest(app, admin, 'get', `/spaces/${String(id)}`);
  return (dataOf(response) as { isVerified: boolean }).isVerified;
};

/** The person's links, as they are stored. */
const links = (userId: number) =>
  prisma.spaceManager.findMany({
    where: { userId },
    select: { spaceId: true, role: true, deactivatedAt: true },
    orderBy: { spaceId: 'asc' },
  });

function link(userId: number, id = spaceId) {
  return adminRequest(app, admin, 'post', `/spaces/${String(id)}/owners`, { userId });
}

function unlink(userId: number, id = spaceId) {
  return adminRequest(app, admin, 'delete', `/spaces/${String(id)}/owners/${String(userId)}`);
}

/** The audit entries, without the actor (always the admin) and the space's ids. */
async function entries() {
  return (await auditEntries()).map(({ action, entityType, before, after }) => ({
    action,
    entityType,
    before,
    after,
  }));
}

/** Waits for a request that waits on a lock the test holds. */
const aWhile = () => new Promise((resolve) => setTimeout(resolve, 500));

describe('POST /admin/spaces/:spaceId/owners', () => {
  it.each(REFUSED_CALLERS)('refuses a $caller with $status', async ({ caller, ...refusal }) => {
    const user = await person();

    const response = await adminRequest(app, caller, 'post', `/spaces/${String(spaceId)}/owners`, {
      userId: user.id,
    });

    expect(response.status).toBe(refusal.status);
    const error = errorOf(response);
    expect({ type: error.type, code: error.code }).toEqual({
      type: refusal.type,
      code: refusal.code,
    });
    expect(await links(user.id)).toEqual([]);
  });

  it('makes a user the space’s owner: the space is verified, and their sessions end', async () => {
    const user = await person();
    await session(user.id);

    const response = await link(user.id);

    expect(response.status).toBe(204);
    expect(await links(user.id)).toEqual([{ spaceId, role: 'OWNER', deactivatedAt: null }]);
    expect(await role(user.id)).toBe('OWNER');
    expect(await sessions(user.id)).toBe(0);
    expect(await verified()).toBe(true);
    expect(await entries()).toEqual([
      {
        action: 'space.ownerLinked',
        entityType: 'space',
        before: null,
        after: { userId: user.id },
      },
      {
        action: 'user.roleChanged',
        entityType: 'user',
        before: { role: 'USER' },
        after: { role: 'OWNER' },
      },
    ]);
  });

  it('links an owner to one more space, changing no role and ending no session', async () => {
    const owner = await person('OWNER');
    await prisma.spaceManager.create({ data: { spaceId, userId: owner.id } });
    const { id: other } = await createSpace('other-hub');
    await session(owner.id);

    expect((await link(owner.id, other)).status).toBe(204);

    expect((await links(owner.id)).map((row) => row.spaceId)).toEqual([spaceId, other]);
    expect(await role(owner.id)).toBe('OWNER');
    expect(await sessions(owner.id)).toBe(1);
    expect((await entries()).map(({ action }) => action)).toEqual(['space.ownerLinked']);
  });

  it('writes nothing for an owner already linked to the space', async () => {
    const owner = await person('OWNER');
    await prisma.spaceManager.create({ data: { spaceId, userId: owner.id } });

    expect((await link(owner.id)).status).toBe(204);

    expect(await entries()).toEqual([]);
  });

  it('reactivates the owner’s deactivated link, the same row', async () => {
    const user = await person();
    await prisma.spaceManager.create({ data: { spaceId, userId: user.id, deactivatedAt: NOW } });

    expect((await link(user.id)).status).toBe(204);

    expect(await links(user.id)).toEqual([{ spaceId, role: 'OWNER', deactivatedAt: null }]);
    expect(await role(user.id)).toBe('OWNER');
  });

  it('makes a deactivated reception link an owner’s, and the entry says the role there changed', async () => {
    const user = await person();
    await prisma.spaceManager.create({
      data: { spaceId, userId: user.id, role: 'RECEPTION', deactivatedAt: NOW },
    });

    expect((await link(user.id)).status).toBe(204);

    expect(await links(user.id)).toEqual([{ spaceId, role: 'OWNER', deactivatedAt: null }]);
    expect((await entries())[0]).toEqual({
      action: 'space.ownerLinked',
      entityType: 'space',
      before: { role: 'RECEPTION' },
      after: { userId: user.id, role: 'OWNER' },
    });
  });

  it.each([
    ['an admin', () => person('ADMIN'), 'ACCOUNT_IS_ADMIN'],
    ['a suspended account', () => person('USER', { suspended: true }), 'ACCOUNT_SUSPENDED'],
    [
      'the space’s active reception',
      async () => {
        const user = await person();
        await prisma.spaceManager.create({ data: { spaceId, userId: user.id, role: 'RECEPTION' } });
        return user;
      },
      'RECEPTION_LINK_ACTIVE',
    ],
  ])('refuses %s with 409, writing nothing', async (_case, make, code) => {
    const user = await make();
    const before = await links(user.id);

    const response = await link(user.id);

    expect(response.status).toBe(409);
    expect({ type: errorOf(response).type, code: errorOf(response).code }).toEqual({
      type: 'conflict',
      code,
    });
    expect(await links(user.id)).toEqual(before);
    expect(await entries()).toEqual([]);
  });

  it('refuses an unknown person on its field', async () => {
    const response = await link(999_999);

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ userId: ['invalid_choice'] });
  });

  it('answers not_found for a soft-deleted space and an unknown one, writing nothing', async () => {
    const user = await person();
    await prisma.space.update({ where: { id: spaceId }, data: { deletedAt: NOW } });

    expect((await link(user.id)).status).toBe(404);
    expect((await link(user.id, 999_999)).status).toBe(404);
    expect(await links(user.id)).toEqual([]);
  });

  it('waits for the space’s lock, so a save on the space decides on the link (finding 43)', async () => {
    const user = await person();
    let pending: ReturnType<typeof link> | undefined;
    let duringHold: unknown[] = [];
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;
      pending = link(user.id);
      await aWhile();
      duringHold = await links(user.id);
    });

    expect((await pending)?.status).toBe(204);
    expect(duringHold).toEqual([]);
    expect(await links(user.id)).toHaveLength(1);
  });

  it('ends a session a sign-in opened while the link waited for the person’s lock', async () => {
    const user = await person();
    let pending: ReturnType<typeof link> | undefined;
    // A sign-in in progress holds the person's session lock, and commits a new session after the
    // link has started waiting for it (conventions §13).
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR NO KEY UPDATE`;
      await session(user.id, tx);
      pending = link(user.id);
      await aWhile();
    });

    expect((await pending)?.status).toBe(204);
    expect(await role(user.id)).toBe('OWNER');
    expect(await sessions(user.id)).toBe(0);
  });
});

describe('DELETE /admin/spaces/:spaceId/owners/:userId', () => {
  it.each(REFUSED_CALLERS)('refuses a $caller with $status', async ({ caller, ...refusal }) => {
    const owner = await person('OWNER');
    await prisma.spaceManager.create({ data: { spaceId, userId: owner.id } });

    const response = await adminRequest(
      app,
      caller,
      'delete',
      `/spaces/${String(spaceId)}/owners/${String(owner.id)}`,
    );

    expect(response.status).toBe(refusal.status);
    expect(errorOf(response).code).toBe(refusal.code);
    expect(await links(owner.id)).toEqual([{ spaceId, role: 'OWNER', deactivatedAt: null }]);
  });

  it('ends the last owner link: the space is unverified, the person a user, their sessions ended', async () => {
    const owner = await person('OWNER');
    await prisma.spaceManager.create({ data: { spaceId, userId: owner.id } });
    await session(owner.id);

    expect((await unlink(owner.id)).status).toBe(204);

    expect(await links(owner.id)).toEqual([{ spaceId, role: 'OWNER', deactivatedAt: NOW }]);
    expect(await role(owner.id)).toBe('USER');
    expect(await sessions(owner.id)).toBe(0);
    expect(await verified()).toBe(false);
    expect(await entries()).toEqual([
      {
        action: 'space.ownerUnlinked',
        entityType: 'space',
        before: { userId: owner.id },
        after: null,
      },
      {
        action: 'user.roleChanged',
        entityType: 'user',
        before: { role: 'OWNER' },
        after: { role: 'USER' },
      },
    ]);
  });

  it('ends one of two links, changing no role and ending no session', async () => {
    const owner = await person('OWNER');
    const { id: other } = await createSpace('other-hub');
    await prisma.spaceManager.create({ data: { spaceId, userId: owner.id } });
    await prisma.spaceManager.create({ data: { spaceId: other, userId: owner.id } });
    await session(owner.id);

    expect((await unlink(owner.id)).status).toBe(204);

    expect(await role(owner.id)).toBe('OWNER');
    expect(await sessions(owner.id)).toBe(1);
    expect(await verified()).toBe(false);
    expect(await verified(other)).toBe(true);
    expect((await entries()).map(({ action }) => action)).toEqual(['space.ownerUnlinked']);
  });

  it('keeps the space verified while another owner remains', async () => {
    const [first, second] = [await person('OWNER'), await person('OWNER')];
    await prisma.spaceManager.create({ data: { spaceId, userId: first.id } });
    await prisma.spaceManager.create({ data: { spaceId, userId: second.id } });

    expect((await unlink(first.id)).status).toBe(204);

    expect(await verified()).toBe(true);
  });

  it('writes nothing when there is no owner link to end: a repeat, a reception link, no one', async () => {
    const owner = await person('OWNER');
    await prisma.spaceManager.create({ data: { spaceId, userId: owner.id, deactivatedAt: NOW } });
    const reception = await person();
    await prisma.spaceManager.create({
      data: { spaceId, userId: reception.id, role: 'RECEPTION' },
    });

    for (const userId of [owner.id, reception.id, 999_999]) {
      expect((await unlink(userId)).status).toBe(204);
    }

    expect(await links(reception.id)).toEqual([
      { spaceId, role: 'RECEPTION', deactivatedAt: null },
    ]);
    expect(await role(owner.id)).toBe('OWNER');
    expect(await entries()).toEqual([]);
  });

  it('answers not_found for a soft-deleted space and an unknown one', async () => {
    const owner = await person('OWNER');
    await prisma.spaceManager.create({ data: { spaceId, userId: owner.id } });
    await prisma.space.update({ where: { id: spaceId }, data: { deletedAt: NOW } });

    expect((await unlink(owner.id)).status).toBe(404);
    expect((await unlink(owner.id, 999_999)).status).toBe(404);
    expect(await links(owner.id)).toEqual([{ spaceId, role: 'OWNER', deactivatedAt: null }]);
  });

  it('makes a person a user again when their two links end at once', async () => {
    const owner = await person('OWNER');
    const { id: other } = await createSpace('other-hub');
    await prisma.spaceManager.create({ data: { spaceId, userId: owner.id } });
    await prisma.spaceManager.create({ data: { spaceId: other, userId: owner.id } });
    const pending: ReturnType<typeof unlink>[] = [];
    // Both unlinks wait for the person's lock, so each counts the links the other left.
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${owner.id} FOR NO KEY UPDATE`;
      pending.push(unlink(owner.id), unlink(owner.id, other));
      await aWhile();
    });

    expect((await Promise.all(pending)).map(({ status }) => status)).toEqual([204, 204]);
    expect(await role(owner.id)).toBe('USER');
  });
});
