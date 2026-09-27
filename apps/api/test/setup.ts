import { afterAll, beforeAll } from 'vitest';

import { prisma } from '../src/db/index.ts';
import { resetDatabase } from './reset-database.ts';

// Runs in every API test file: each one starts from an empty test database.
beforeAll(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});
