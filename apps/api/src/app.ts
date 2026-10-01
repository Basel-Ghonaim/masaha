import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';

import { prisma } from './db/index.ts';
import type { PrismaClient } from './generated/prisma/client.ts';
import { errorHandler, notFoundHandler } from './shared/errors/index.ts';
import { requestLogger } from './shared/http/index.ts';
import {
  clientAddress,
  createCounter,
  createLimiter,
  limitRequests,
  type RateLimitPolicy,
} from './shared/rate-limit/index.ts';

const FIFTEEN_MINUTES = 15 * 60_000;

// The general limit on every API request (docs/backend/security.md › Rate limits). Guests count by
// address, with a higher ceiling: a whole coworking space may share one address.
const GENERAL_GUEST: RateLimitPolicy = {
  name: 'general-guest',
  limit: 1_200,
  windowMs: FIFTEEN_MINUTES,
};

export interface AppOptions {
  corsOrigin: string;
  logger: Logger;
  /** Whether the database is reachable; /health reports it. */
  checkDatabase: () => Promise<boolean>;
  /** Which proxies to trust for the client's address (TRUST_PROXY). Default: loopback. */
  trustProxy?: boolean | number | string;
  /** Mounted at /api/v1. */
  apiRouter?: Router;
}

/** Builds the Express app around the API's router. */
export function createApp({
  corsOrigin,
  logger,
  checkDatabase,
  trustProxy = 'loopback',
  apiRouter = Router(),
}: AppOptions) {
  const app = express();
  app.set('trust proxy', trustProxy);

  // First, so every response has a request id and a log line, even one the JSON parser refuses.
  app.use(requestLogger(logger));
  app.use(helmet());
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());

  // Outside /api/v1 and not enveloped, so any probe can read it (docs/api/api-contract.md §1).
  app.get('/health', async (_req, res) => {
    const up = await checkDatabase();
    res.status(up ? 200 : 503).json({
      status: up ? 'ok' : 'error',
      db: up ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/v1', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export interface ApiOptions {
  db?: PrismaClient;
}

/**
 * The composition root (docs/backend/conventions.md §1): builds each module's service, wires the
 * ports and mounts every router where the API contract puts it, behind the general rate limit.
 */
export function createApi({ db = prisma }: ApiOptions = {}): Router {
  const limiter = createLimiter(createCounter(db));

  const api = Router();
  api.use(
    limitRequests(limiter, (req) => ({ policy: GENERAL_GUEST, by: [clientAddress(req.ip)] })),
  );
  return api;
}
