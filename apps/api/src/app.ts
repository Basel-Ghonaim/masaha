import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';

import { errorHandler, notFoundHandler } from './shared/errors/index.ts';
import { requestLogger } from './shared/http/index.ts';

export interface AppOptions {
  corsOrigin: string;
  logger: Logger;
  /** Whether the database is reachable; /health reports it. */
  checkDatabase: () => Promise<boolean>;
  /** Mounted at /api/v1. */
  apiRouter?: Router;
}

/** Builds the Express app. The middleware order is fixed (docs/backend/conventions.md §1). */
export function createApp({ corsOrigin, logger, checkDatabase, apiRouter = Router() }: AppOptions) {
  const app = express();

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
