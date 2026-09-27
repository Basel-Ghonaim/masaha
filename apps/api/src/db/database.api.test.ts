import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { resetDatabase } from '../../test/reset-database.ts';
import { prisma } from './prisma.ts';

describe('the test database', () => {
  it('is reached through the Prisma client', async () => {
    const [row] = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;

    expect(row?.name).toMatch(/_test$/);
  });

  describe('between test files', () => {
    beforeAll(async () => {
      await prisma.$executeRawUnsafe('CREATE TABLE reset_probe (id SERIAL PRIMARY KEY)');
    });

    afterAll(async () => {
      await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS reset_probe');
    });

    it('is emptied, with its ID sequences restarted', async () => {
      await prisma.$executeRawUnsafe('INSERT INTO reset_probe DEFAULT VALUES');
      await prisma.$executeRawUnsafe('INSERT INTO reset_probe DEFAULT VALUES');

      await resetDatabase(prisma);

      const [count] = await prisma.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM reset_probe`;
      expect(count?.n).toBe(0);

      const [next] = await prisma.$queryRaw<{ id: number }[]>`
        INSERT INTO reset_probe DEFAULT VALUES RETURNING id`;
      expect(next?.id).toBe(1);
    });
  });
});
