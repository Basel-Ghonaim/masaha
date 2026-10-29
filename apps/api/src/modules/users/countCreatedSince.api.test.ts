import { beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../../db/index.ts';
import { createUsersRepository } from './users.repository.ts';

// The accounts created since an instant, counted for the admin's overview (docs/features/users.md).

const SINCE = new Date('2026-09-25T21:00:00.000Z');

beforeEach(async () => {
  await resetDatabase(prisma);
});

function account(email: string, createdAt: Date) {
  return prisma.user.create({ data: { email, name: 'Sara', passwordHash: 'x', createdAt } });
}

describe('the accounts created since an instant', () => {
  it('countCreatedSince counts the accounts created from that instant', async () => {
    await account('before@example.com', new Date(SINCE.getTime() - 1));
    await account('at@example.com', SINCE);
    await account('after@example.com', new Date('2026-10-20T09:00:00.000Z'));

    expect(await createUsersRepository().countCreatedSince(SINCE)).toBe(2);
  });
});
