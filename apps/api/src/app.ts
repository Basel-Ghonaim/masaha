import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';

import { createRunInTransaction } from './db/index.ts';
import {
  createAuthController,
  createAuthRouter,
  createAuthService,
  createCappedEmailSender,
  type EmailSender,
  type GoogleIdentity,
} from './modules/auth/index.ts';
import { createSessionCookies, createSessionsService } from './modules/sessions/index.ts';
import { createSpaceLinksService } from './modules/space-links/index.ts';
import {
  createUsersController,
  createUsersMeRouter,
  createUsersService,
} from './modules/users/index.ts';
import { createAccessTokens, createRequireAuth, readAccessToken } from './shared/auth/index.ts';
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

// The general limit on every API request (docs/backend/security.md › Rate limits): by the user when
// the request is signed in, otherwise by address, with a higher ceiling, because a whole coworking
// space may share one address.
const GENERAL_USER: RateLimitPolicy = {
  name: 'general-user',
  limit: 300,
  windowMs: FIFTEEN_MINUTES,
};
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
  /** Signs and verifies the access tokens (JWT_SECRET). */
  jwtSecret: string;
  /** Whether the session cookies are Secure: in production, over HTTPS. */
  secureCookies: boolean;
  /** Google's identity, when a Google client id is configured (GOOGLE_CLIENT_ID). */
  google?: GoogleIdentity;
  /** The reset email's sender for this environment (EMAIL_MODE); its caps are added here. */
  email: EmailSender;
  /** The web's origin, where the reset email's link leads. */
  webOrigin: string;
  logger: Logger;
}

/**
 * The composition root (docs/backend/conventions.md §1): builds each module's service, wires the
 * ports and mounts every router where the API contract puts it, behind the general rate limit.
 */
export function createApi({
  jwtSecret,
  secureCookies,
  google,
  email,
  webOrigin,
  logger,
}: ApiOptions): Router {
  const limiter = createLimiter(createCounter());
  const accessTokens = createAccessTokens(jwtSecret);
  const cookies = createSessionCookies({ secure: secureCookies });

  const requireAuth = createRequireAuth(accessTokens);
  const runInTransaction = createRunInTransaction();

  const sessions = createSessionsService();
  const users = createUsersService({ accessTokens, sessions, runInTransaction });
  const spaceLinks = createSpaceLinksService();
  const auth = createAuthService({
    users,
    sessions,
    spaceLinks,
    accessTokens,
    limiter,
    runInTransaction,
    google,
    email: createCappedEmailSender(email, { limiter, logger }),
    webOrigin,
  });

  const api = Router();
  api.use(
    limitRequests(limiter, async (req) => {
      const claims = await readAccessToken(req, accessTokens);
      return claims
        ? { policy: GENERAL_USER, by: [String(claims.userId)] }
        : { policy: GENERAL_GUEST, by: [clientAddress(req.ip)] };
    }),
  );
  api.use('/auth', createAuthRouter(createAuthController(auth, cookies)));
  api.use('/me', createUsersMeRouter(createUsersController(users, cookies), requireAuth));
  return api;
}
