import { existsSync } from 'node:fs';

import { defineConfig } from 'prisma/config';

// Prisma does not load .env itself; Node does, as it does for the API (no dotenv).
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Only migrate and studio need the URL; generate runs without one (in CI's install, for example).
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
