import { randomUUID } from 'node:crypto';
import type { RequestListener } from 'node:http';

import type { ErrorEnvelope } from '@masaha/shared/core';

import { createAppFromEnv } from './app.ts';
import { EnvError, loadEnv } from './config/index.ts';
import { isDatabaseUp, prisma } from './db/index.ts';
import { createLogger } from './shared/http/index.ts';

// The API's entry on Vercel, a function (ADR 0014; docs/backend/conventions.md §12): the same app as
// server.ts builds, from the same composition root, and nothing a function cannot do. No timer (the
// external cron calls the jobs' endpoint), no listen, no exit, no signal handlers. The environment
// is validated once per instance, when Vercel loads this module; the database is checked by
// /health, never at load.

/** Every request's answer when the environment is invalid: the server error, in the envelope. */
const misconfigured: RequestListener = (_req, res) => {
  const body: ErrorEnvelope = {
    success: false,
    error: { type: 'server', message: 'Internal server error', requestId: randomUUID() },
  };
  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

function createHandler(): RequestListener {
  try {
    const env = loadEnv();
    const logger = createLogger(env.LOG_LEVEL);
    return createAppFromEnv(env, { logger, checkDatabase: () => isDatabaseUp(prisma) });
  } catch (error) {
    if (!(error instanceof EnvError)) throw error;
    // The message names each variable and its rule, never a value (config/env.ts). The logger's level
    // comes from the environment, so it goes straight to stderr, as server.ts writes it.
    process.stderr.write(`${error.message}\n`);
    return misconfigured;
  }
}

export default createHandler();
