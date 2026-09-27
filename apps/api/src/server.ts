import { pino } from 'pino';

import { createApp } from './app.ts';
import { EnvError, loadEnv, type Env } from './config/index.ts';
import { isDatabaseUp, prisma } from './db/index.ts';

const SHUTDOWN_TIMEOUT_MS = 10_000;

function readEnv(): Env {
  try {
    return loadEnv();
  } catch (error) {
    if (!(error instanceof EnvError)) throw error;
    // The logger's level comes from the environment, so this message goes straight to stderr.
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

const env = readEnv();
const logger = pino({ level: env.LOG_LEVEL });

// The API refuses to start without a reachable database (docs/backend/security.md).
try {
  await prisma.$queryRaw`SELECT 1`;
} catch (error) {
  logger.fatal(
    { err: error },
    'Cannot reach the database at DATABASE_URL. Is PostgreSQL running? Start it with `npm run db:up`.',
  );
  process.exit(1);
}

const app = createApp({
  corsOrigin: env.CORS_ORIGIN,
  logger,
  checkDatabase: () => isDatabaseUp(prisma),
});

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'API listening');
});

function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, 'Shutting down');
  // Open connections get a grace period to finish; after it, the process exits anyway.
  setTimeout(() => {
    logger.error('Shutdown timed out; forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
  server.close((error) => {
    if (error) logger.error({ err: error }, 'Error while closing the server');
    void prisma.$disconnect().finally(() => process.exit(error ? 1 : 0));
  });
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
