import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

export interface AppOptions {
  corsOrigin: string;
  logger: Logger;
  /** Mounted at /api/v1. */
  apiRouter?: Router;
}

/** Builds the Express app. The middleware order is fixed (docs/backend/conventions.md §1). */
export function createApp({ corsOrigin, logger, apiRouter = Router() }: AppOptions) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  // Outside /api/v1 and not enveloped, so any probe can read it (docs/api/api-contract.md §1).
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1', apiRouter);

  return app;
}
