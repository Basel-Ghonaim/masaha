import { afterAll, beforeAll, beforeEach } from 'vitest';

import { prisma } from '../src/db/index.ts';
import { resetDatabase } from './reset-database.ts';

// Runs in every API test file: each one starts from an empty test database.
beforeAll(async () => {
  await resetDatabase(prisma);
});

// Each test starts with no rate-limit counts, so the requests of one test never limit the next.
beforeEach(async () => {
  await prisma.rateLimit.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
