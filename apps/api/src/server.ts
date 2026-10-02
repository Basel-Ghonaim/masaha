import { createApi, createApp } from './app.ts';
import {
  createGoogleIdentity,
  createLogEmailSender,
  createSmtpEmailSender,
} from './modules/auth/index.ts';
import { EnvError, loadEnv, secureCookiesOf, trustProxyOf, type Env } from './config/index.ts';
import { isDatabaseUp, prisma } from './db/index.ts';
import { createLogger } from './shared/http/index.ts';

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
const logger = createLogger(env.LOG_LEVEL);

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
  trustProxy: trustProxyOf(env),
  apiRouter: createApi({
    jwtSecret: env.JWT_SECRET,
    secureCookies: secureCookiesOf(env),
    google: env.GOOGLE_CLIENT_ID
      ? createGoogleIdentity({ clientId: env.GOOGLE_CLIENT_ID })
      : undefined,
    // The environment guarantees the SMTP settings in smtp mode, and log mode only in development.
    email:
      env.EMAIL_MODE === 'smtp'
        ? createSmtpEmailSender({
            host: env.SMTP_HOST ?? '',
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            user: env.SMTP_USER ?? '',
            password: env.SMTP_PASSWORD ?? '',
            from: env.EMAIL_FROM ?? '',
          })
        : createLogEmailSender(logger),
    webOrigin: env.CORS_ORIGIN,
    logger,
  }),
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
