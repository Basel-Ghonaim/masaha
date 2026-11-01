import { describe, expect, it } from 'vitest';

import { resetDatabase } from '../../test/reset-database.ts';
import { RACE_TIMEOUT_MS, waitingOnLock } from '../../test/locks.ts';
import { createSpace } from '../../test/factories.ts';
import { prisma } from './index.ts';

// The race helper the API tests' races wait with (apps/api/test/locks.ts, finding 77): proven on the
// database itself, since what it counts is PostgreSQL's view of who waits on what.

describe('the race helper', () => {
  it(
    'waitingOnLock needs its table, and counts only that table’s waiters',
    async () => {
      await resetDatabase(prisma);
      const space = await createSpace();
      const user = await prisma.user.create({
        data: { email: 'sara@example.com', name: 'Sara', passwordHash: 'x' },
      });
      let release: () => void = () => undefined;
      let held: Promise<unknown> | undefined;
      // One transaction holds a space's row and a user's; a backend waits on each.
      await new Promise<void>((taken, failed) => {
        held = prisma.$transaction(
          async (tx) => {
            await tx.$queryRaw`SELECT id FROM spaces WHERE id = ${space.id} FOR UPDATE`;
            await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`;
            await new Promise<void>((released) => {
              release = released;
              taken();
            });
          },
          { timeout: RACE_TIMEOUT_MS },
        );
        held.catch(failed);
      });
      const onSpace = prisma.$transaction(
        (tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${space.id} FOR UPDATE`,
      );
      const onUser = prisma.$transaction(
        (tx) => tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`,
      );

      try {
        // Both wait once each table's waiter is found; then each table counts its own alone.
        await waitingOnLock({ on: 'spaces' });
        const users = await waitingOnLock({ on: 'users' });
        const spaces = await waitingOnLock({ on: 'spaces' });

        expect(spaces).toHaveLength(1);
        expect(users).toHaveLength(1);
        expect(spaces).not.toEqual(users);
        // @ts-expect-error A race names the table its request waits on.
        const untargeted: Parameters<typeof waitingOnLock>[0] = { count: 1 };
        expect(untargeted).toEqual({ count: 1 });
      } finally {
        release();
        await held;
        await Promise.all([onSpace, onUser]);
      }
    },
    RACE_TIMEOUT_MS,
  );
});
