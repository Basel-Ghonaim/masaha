import type { PaginationMeta } from '@masaha/shared/core';
import type { AdminUserRow } from '@masaha/shared/space-links';
import { beforeEach, describe, expect, it } from 'vitest';

import { adminRequest, dataOf, errorOf, REFUSED_CALLERS, signIn } from '../../../../test/admin.ts';
import { createTestApp } from '../../../../test/app.ts';
import { createSpace } from '../../../../test/factories.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { prisma } from '../../../db/index.ts';
import type { Role } from '../../../generated/prisma/enums.ts';

const NOW = new Date('2026-10-06T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });

let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  admin = await signIn('ADMIN');
  // The admin joined first, so it comes last in a list ordered newest first.
  await prisma.user.update({
    where: { id: admin.id },
    data: { createdAt: new Date('2025-01-10T09:00:00Z') },
  });
});

interface AccountOptions {
  role?: Role;
  suspended?: boolean;
  password?: boolean;
  google?: boolean;
  /** The day it joined. */
  joined?: string;
}

/** An account named `name`, with an email from it, joined on `joined`. */
function account(name: string, options: AccountOptions = {}) {
  const { role = 'USER', suspended = false, password = true, google = false } = options;
  const { joined = '2026-01-01' } = options;
  return prisma.user.create({
    data: {
      name,
      email: `${name.toLowerCase().replaceAll(' ', '.')}@example.com`,
      role,
      passwordHash: password ? 'x' : null,
      googleSubject: google ? `google-${name}` : null,
      suspendedAt: suspended ? NOW : null,
      createdAt: new Date(`${joined}T09:00:00Z`),
    },
  });
}

/** A link of the user to the space, as its owner unless told otherwise, made on `day`. */
function link(
  spaceId: number,
  userId: number,
  { role = 'OWNER', deactivated = false, day = '2026-02-01' } = {},
) {
  return prisma.spaceManager.create({
    data: {
      spaceId,
      userId,
      role: role as 'OWNER' | 'RECEPTION',
      createdAt: new Date(`${day}T09:00:00Z`),
      deactivatedAt: deactivated ? NOW : null,
    },
  });
}

async function list(query = '') {
  const response = await adminRequest(app, admin, 'get', `/users${query}`);
  expect(response.status).toBe(200);
  return {
    rows: dataOf(response) as AdminUserRow[],
    meta: (response.body as { meta: PaginationMeta }).meta,
  };
}

const names = (rows: AdminUserRow[]) => rows.map(({ name }) => name);

describe('GET /admin/users', () => {
  it.each(REFUSED_CALLERS)('refuses a $caller with $status', async ({ caller, ...refusal }) => {
    const response = await adminRequest(app, caller, 'get', '/users');

    expect(response.status).toBe(refusal.status);
    const error = errorOf(response);
    expect({ type: error.type, code: error.code }).toEqual({
      type: refusal.type,
      code: refusal.code,
    });
  });

  it('lists each account with its role, its state, how it signs in, when it joined and the spaces it owns', async () => {
    const hub = await createSpace('focus-hub');
    const nour = await account('Nour', { role: 'OWNER', google: true, joined: '2026-09-23' });
    await link(hub.id, nour.id);
    const khaled = await account('Khaled', { suspended: true, joined: '2026-08-02' });
    const sara = await account('Sara', { password: false, google: true, joined: '2026-09-27' });

    const { rows } = await list();

    expect(rows).toEqual([
      {
        id: sara.id,
        name: 'Sara',
        email: 'sara@example.com',
        role: 'USER',
        isSuspended: false,
        signIn: { password: false, google: true },
        joinedAt: '2026-09-27T09:00:00.000Z',
        spaces: [],
        receptionSpaces: [],
      },
      {
        id: nour.id,
        name: 'Nour',
        email: 'nour@example.com',
        role: 'OWNER',
        isSuspended: false,
        signIn: { password: true, google: true },
        joinedAt: '2026-09-23T09:00:00.000Z',
        spaces: [{ id: hub.id, nameEn: 'Focus Hub', nameAr: 'فوكس هاب' }],
        receptionSpaces: [],
      },
      {
        id: khaled.id,
        name: 'Khaled',
        email: 'khaled@example.com',
        role: 'USER',
        isSuspended: true,
        signIn: { password: true, google: false },
        joinedAt: '2026-08-02T09:00:00.000Z',
        spaces: [],
        receptionSpaces: [],
      },
      {
        id: admin.id,
        name: 'Sara',
        email: 'admin@example.com',
        role: 'ADMIN',
        isSuspended: false,
        signIn: { password: true, google: false },
        joinedAt: '2025-01-10T09:00:00.000Z',
        spaces: [],
        receptionSpaces: [],
      },
    ]);
  });

  it('gives an owner only their active owner links, oldest first, leaving a soft-deleted space out', async () => {
    const owner = await account('Ahmad', { role: 'OWNER' });
    const later = await createSpace('later');
    const earlier = await createSpace('earlier');
    const deactivated = await createSpace('deactivated');
    const reception = await createSpace('reception');
    const deleted = await createSpace('deleted');
    await link(later.id, owner.id, { day: '2026-03-01' });
    await link(earlier.id, owner.id, { day: '2026-02-01' });
    await link(deactivated.id, owner.id, { deactivated: true });
    await link(reception.id, owner.id, { role: 'RECEPTION' });
    await link(deleted.id, owner.id);
    await prisma.space.update({ where: { id: deleted.id }, data: { deletedAt: NOW } });

    const { rows } = await list('?role=owner');

    expect(rows.map(({ spaces }) => spaces.map(({ id }) => id))).toEqual([[earlier.id, later.id]]);
  });

  it('each row lists the person’s active reception links, beside the spaces they own', async () => {
    const receptionist = await account('Nour');
    const owner = await account('Ahmad', { role: 'OWNER' });
    const desk = await createSpace('desk');
    const left = await createSpace('left');
    const deleted = await createSpace('deleted');
    await link(desk.id, receptionist.id, { role: 'RECEPTION' });
    await link(left.id, receptionist.id, { role: 'RECEPTION', deactivated: true });
    await link(deleted.id, receptionist.id, { role: 'RECEPTION' });
    await prisma.space.update({ where: { id: deleted.id }, data: { deletedAt: NOW } });
    await link(desk.id, owner.id);

    const { rows } = await list();

    const rowOf = (id: number) => rows.find((row) => row.id === id);
    expect(rowOf(receptionist.id)).toMatchObject({
      spaces: [],
      receptionSpaces: [{ id: desk.id, nameEn: desk.nameEn, nameAr: desk.nameAr }],
    });
    expect(rowOf(owner.id)).toMatchObject({
      spaces: [{ id: desk.id }],
      receptionSpaces: [],
    });
  });

  it('orders the newest first, 20 to a page, with the total', async () => {
    for (let day = 1; day <= 20; day += 1) {
      await account(`User ${String(day)}`, { joined: `2026-03-${String(day).padStart(2, '0')}` });
    }

    const first = await list();
    const second = await list('?page=2');

    expect(first.rows).toHaveLength(20);
    expect(names(first.rows).slice(0, 2)).toEqual(['User 20', 'User 19']);
    expect(names(second.rows)).toEqual(['Sara']);
    expect(first.meta).toEqual({
      currentPage: 1,
      limit: 20,
      totalPages: 2,
      totalRecords: 21,
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it('searches the name and the email, whatever the case, and counts only what it keeps', async () => {
    await account('Maha Saleh', { joined: '2026-02-01' });
    await account('Omar', { joined: '2026-03-01' });

    const byName = await list('?q=MAHA');
    expect(names(byName.rows)).toEqual(['Maha Saleh']);
    expect(byName.meta.totalRecords).toBe(1);
    expect(names((await list('?q=omar%40EXAMPLE')).rows)).toEqual(['Omar']);
  });

  it.each([
    ['?role=owner', ['Ahmad'], 1],
    ['?role=user', ['Rima', 'Layan'], 2],
    ['?role=admin', ['Sara'], 1],
    ['?state=suspended', ['Rima'], 1],
    ['?state=active', ['Ahmad', 'Layan', 'Sara'], 3],
    ['?role=user&state=active', ['Layan'], 1],
  ])(
    'filters by role and state, and counts only what it keeps: %s',
    async (query, expected, total) => {
      await account('Layan', { joined: '2026-02-01' });
      await account('Ahmad', { role: 'OWNER', joined: '2026-03-01' });
      await account('Rima', { suspended: true, joined: '2026-04-01' });

      const { rows, meta } = await list(query);

      expect(names(rows)).toEqual(expected);
      expect(meta.totalRecords).toBe(total);
    },
  );

  it('refuses an unknown role or state', async () => {
    for (const query of ['?role=reception', '?state=deleted']) {
      const response = await adminRequest(app, admin, 'get', `/users${query}`);

      expect(response.status).toBe(422);
      expect(errorOf(response).errors).toEqual(
        query.startsWith('?role') ? { role: ['invalid_choice'] } : { state: ['invalid_choice'] },
      );
    }
  });
});
