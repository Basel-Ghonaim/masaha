import { beforeEach, describe, expect, it } from 'vitest';

import {
  adminRequest,
  auditEntries,
  errorOf,
  REFUSED_CALLERS,
  signIn,
} from '../../../../test/admin.ts';
import { createAccount, createTestApp, inAWeek } from '../../../../test/app.ts';
import { createSpace } from '../../../../test/factories.ts';
import { lockUsers, whileHeld } from '../../../../test/locks.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { prisma } from '../../../db/index.ts';
import type { Role } from '../../../generated/prisma/enums.ts';

const app = createTestApp();

let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  admin = await signIn('ADMIN');
});

function changeRole(userId: number, role: string, by: { authorization: string } = admin) {
  return adminRequest(app, by, 'put', `/users/${String(userId)}/role`, { role });
}

async function roleOf(userId: number): Promise<Role> {
  return (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).role;
}

/** A session row for the user, as a sign-in leaves one. */
function session(userId: number, tokenHash = `session-${String(userId)}`) {
  return prisma.refreshToken.create({
    data: {
      userId,
      familyId: 0,
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      sessionEndsAt: new Date(Date.now() + 60_000),
    },
  });
}

function sessionsOf(userId: number) {
  return prisma.refreshToken.count({ where: { userId } });
}

/** A link of the user to a space of its own, active unless told otherwise. */
async function link(
  userId: number,
  role: 'OWNER' | 'RECEPTION',
  { slug = 'focus-hub', deactivated = false, deleted = false } = {},
) {
  const space = await createSpace(slug);
  if (deleted) {
    await prisma.space.update({ where: { id: space.id }, data: { deletedAt: new Date() } });
  }
  await prisma.spaceManager.create({
    data: { spaceId: space.id, userId, role, deactivatedAt: deactivated ? new Date() : null },
  });
  return space;
}

describe('PUT /admin/users/:userId/role: the tokens signed before', () => {
  it('refuses them, for a user made an admin and for an admin made a user', async () => {
    const user = await signIn('USER', 'user@example.com');
    const other = await signIn('ADMIN', 'other@example.com');
    expect((await adminRequest(app, user, 'get', '/users')).status).toBe(403);
    expect((await adminRequest(app, other, 'get', '/users')).status).toBe(200);

    expect((await changeRole(user.id, 'ADMIN')).status).toBe(204);
    expect((await changeRole(other.id, 'USER')).status).toBe(204);

    for (const before of [user, other]) {
      const response = await adminRequest(app, before, 'get', '/users');
      expect(response.status).toBe(401);
      expect(errorOf(response)).toMatchObject({ type: 'unauthorized' });
    }
  });
});

describe('PUT /admin/users/:userId/role', () => {
  it.each(REFUSED_CALLERS)('refuses a $caller with $status', async ({ caller, ...refusal }) => {
    const user = await createAccount();

    const response = await adminRequest(app, caller, 'put', `/users/${String(user.id)}/role`, {
      role: 'ADMIN',
    });

    expect(response.status).toBe(refusal.status);
    expect(errorOf(response).code).toBe(refusal.code);
    expect(await roleOf(user.id)).toBe('USER');
  });

  it('makes a user an admin, ending their sessions', async () => {
    const user = await createAccount();
    await session(user.id);

    const response = await changeRole(user.id, 'ADMIN');

    expect(response.status).toBe(204);
    expect(await roleOf(user.id)).toBe('ADMIN');
    expect(await sessionsOf(user.id)).toBe(0);
    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'user.roleChanged',
        entityType: 'user',
        entityId: user.id,
        spaceId: null,
        before: { role: 'USER' },
        after: { role: 'ADMIN' },
      },
    ]);
  });

  it('makes another admin a user while one stays, ending their sessions', async () => {
    const other = await signIn('ADMIN', 'other-admin@example.com');
    await session(other.id);

    const response = await changeRole(other.id, 'USER');

    expect(response.status).toBe(204);
    expect(await roleOf(other.id)).toBe('USER');
    expect(await sessionsOf(other.id)).toBe(0);
    expect(await auditEntries()).toMatchObject([
      { action: 'user.roleChanged', before: { role: 'ADMIN' }, after: { role: 'USER' } },
    ]);
  });

  it('writes nothing and ends no session when the role is already the one asked', async () => {
    const user = await createAccount();
    const reception = await createAccount({ email: 'nour@example.com' });
    await link(reception.id, 'RECEPTION');
    const other = await signIn('ADMIN', 'other-admin@example.com');
    for (const id of [user.id, reception.id, other.id]) await session(id);

    expect((await changeRole(user.id, 'USER')).status).toBe(204);
    expect((await changeRole(reception.id, 'USER')).status).toBe(204);
    expect((await changeRole(other.id, 'ADMIN')).status).toBe(204);

    for (const id of [user.id, reception.id, other.id]) expect(await sessionsOf(id)).toBe(1);
    expect(await auditEntries()).toEqual([]);
  });

  it.each(['ADMIN', 'USER'])('refuses the admin’s own account, asked %s', async (role) => {
    const response = await changeRole(admin.id, role);

    expect(response.status).toBe(409);
    expect(errorOf(response)).toMatchObject({ type: 'conflict', code: 'OWN_ACCOUNT' });
    expect(await roleOf(admin.id)).toBe('ADMIN');
  });

  it.each([
    ['an active owner link', 'OWNER', {}],
    ['an active reception link', 'RECEPTION', {}],
    ['an owner link to a deleted space', 'OWNER', { deleted: true }],
  ] as const)('refuses to make an admin of a person with %s', async (_case, role, options) => {
    const person = await createAccount({ role: role === 'OWNER' ? 'OWNER' : 'USER' });
    await link(person.id, role, options);
    await session(person.id);

    const response = await changeRole(person.id, 'ADMIN');

    expect(response.status).toBe(409);
    expect(errorOf(response)).toMatchObject({ type: 'conflict', code: 'ACCOUNT_HAS_LINKS' });
    expect(await roleOf(person.id)).toBe(role === 'OWNER' ? 'OWNER' : 'USER');
    expect(await sessionsOf(person.id)).toBe(1);
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses to make an owner a user: the role follows the links', async () => {
    const owner = await createAccount({ role: 'OWNER' });
    await link(owner.id, 'OWNER');

    const response = await changeRole(owner.id, 'USER');

    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('ACCOUNT_HAS_LINKS');
    expect(await roleOf(owner.id)).toBe('OWNER');
  });

  it('refuses to make an admin of a person whose temporary password is pending, and still makes a pending admin a user', async () => {
    const pending = { mustChangePassword: true, temporaryPasswordExpiresAt: inAWeek() };
    const person = await createAccount(pending);
    const other = await createAccount({ email: 'other@example.com', role: 'ADMIN', ...pending });

    const refused = await changeRole(person.id, 'ADMIN');

    expect(refused.status).toBe(409);
    expect(errorOf(refused)).toMatchObject({ type: 'conflict', code: 'ACCOUNT_PASSWORD_PENDING' });
    expect(await roleOf(person.id)).toBe('USER');
    expect((await changeRole(other.id, 'USER')).status).toBe(204);
  });

  it('makes an admin of a person whose links have all ended', async () => {
    const person = await createAccount();
    await link(person.id, 'RECEPTION', { deactivated: true });

    expect((await changeRole(person.id, 'ADMIN')).status).toBe(204);
    expect(await roleOf(person.id)).toBe('ADMIN');
  });

  it.each(['OWNER', 'admin', 'ROOT'])('refuses the role %s on its field', async (role) => {
    const user = await createAccount();

    const response = await changeRole(user.id, role);

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ role: ['invalid_choice'] });
  });

  it.each(['999', 'abc'])('answers 404 for the id %s', async (id) => {
    const response = await adminRequest(app, admin, 'put', `/users/${id}/role`, { role: 'ADMIN' });

    expect(response.status).toBe(404);
  });
});

describe('PUT /admin/users/:userId/role: the races', () => {
  it('keeps one of two admins demoting each other at once: the second is the last', async () => {
    const other = await signIn('ADMIN', 'other-admin@example.com');

    // The test demotes `other`, as `admin`'s request would, while `other` demotes `admin`.
    const answer = await whileHeld(
      (tx) => lockUsers(tx, admin.id, other.id),
      () => changeRole(admin.id, 'USER', other),
      (tx) => tx.user.update({ where: { id: other.id }, data: { role: 'USER' } }),
    );

    expect(answer.status).toBe(409);
    expect(errorOf(answer).code).toBe('LAST_ADMIN');
    expect(await roleOf(admin.id)).toBe('ADMIN');
  }, 20_000);

  it('refuses a promotion that waited on a link to the person', async () => {
    const person = await createAccount();
    const space = await createSpace();

    // The test links the person as an owner, as a link change holding their lock would.
    const answer = await whileHeld(
      (tx) => lockUsers(tx, person.id),
      () => changeRole(person.id, 'ADMIN'),
      async (tx) => {
        await tx.spaceManager.create({
          data: { spaceId: space.id, userId: person.id, role: 'OWNER' },
        });
        await tx.user.update({ where: { id: person.id }, data: { role: 'OWNER' } });
      },
    );

    expect(answer.status).toBe(409);
    expect(errorOf(answer).code).toBe('ACCOUNT_HAS_LINKS');
    expect(await roleOf(person.id)).toBe('OWNER');
  }, 20_000);

  it('refuses a link that waited on the person’s promotion', async () => {
    const person = await createAccount();
    const space = await createSpace();

    // The test makes the person an admin, as a role change holding their lock would.
    const answer = await whileHeld(
      (tx) => lockUsers(tx, person.id),
      () =>
        adminRequest(app, admin, 'post', `/spaces/${String(space.id)}/owners`, {
          userId: person.id,
        }),
      (tx) => tx.user.update({ where: { id: person.id }, data: { role: 'ADMIN' } }),
    );

    expect(answer.status).toBe(409);
    expect(errorOf(answer).code).toBe('ACCOUNT_IS_ADMIN');
    expect(await roleOf(person.id)).toBe('ADMIN');
    expect(await prisma.spaceManager.count({ where: { userId: person.id } })).toBe(0);
  }, 20_000);
});
