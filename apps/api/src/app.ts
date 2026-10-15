import { fileURLToPath } from 'node:url';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';

import { secureCookiesOf, trustProxyOf, type Env } from './config/index.ts';
import { createRunInTransaction, type Tx } from './db/index.ts';
import {
  createAuthController,
  createAuthRouter,
  createAuthService,
  createCappedEmailSender,
  createGoogleIdentity,
  createLogEmailSender,
  createSmtpEmailSender,
  type EmailSender,
  type GoogleIdentity,
} from './modules/auth/index.ts';
import {
  createDirectoryController,
  createDirectoryPublicRouter,
  createDirectoryService,
} from './modules/directory/index.ts';
import {
  createAmenitiesController,
  createAmenitiesService,
  createAreasController,
  createAreasService,
  createCatalogueController,
  createCatalogueService,
  createGovernoratesController,
  createGovernoratesService,
  createLookupsAdminRouter,
  createLookupsPublicRouter,
  createLookupsService,
} from './modules/lookups/index.ts';
import {
  createRecoveryCookie,
  createSessionCookies,
  createSessionsService,
} from './modules/sessions/index.ts';
import {
  createAdminOwnersController,
  createAdminOwnersService,
  createAdminRolesController,
  createAdminRolesService,
  createAdminSpacesController,
  createAdminSpacesService,
  createAdminUsersController,
  createAdminUsersService,
  createSpaceLinksAdminRouter,
  createSpaceLinksController,
  createSpaceLinksMeRouter,
  createSpaceLinksService,
} from './modules/space-links/index.ts';
import { createPlatformSettingsService } from './modules/platform-settings/index.ts';
import { createSpaceSettingsService } from './modules/space-settings/index.ts';
import {
  createConfirmController,
  createConfirmService,
  createContactsController,
  createContactsService,
  createHoursController,
  createHoursService,
  createListingService,
  createPhotosController,
  createPhotosService,
  createPricesController,
  createPricesService,
  createProfileController,
  createProfileService,
  createPublicListingService,
  createPublicSpaceService,
  createSpaceAmenitiesController,
  createSpaceAmenitiesService,
  createSpaceController,
  createSpaceService,
  createSpacesAdminRouter,
  createSpacesService,
} from './modules/spaces/index.ts';
import {
  createUsersAdminRouter,
  createUsersController,
  createUsersMeRouter,
  createUsersService,
} from './modules/users/index.ts';
import { writeAudit } from './shared/audit/index.ts';
import {
  createAccessTokens,
  createRequireAuth,
  loadSpaceLinks,
  readAccessToken,
  requireRole,
} from './shared/auth/index.ts';
import { errorHandler, notFoundHandler } from './shared/errors/index.ts';
import { requestLogger } from './shared/http/index.ts';
import {
  clientAddress,
  createCounter,
  FIFTEEN_MINUTES,
  createLimiter,
  limitRequests,
  type RateLimitPolicy,
} from './shared/rate-limit/index.ts';
import {
  createCloudinaryStorage,
  createLocalStorage,
  type Storage,
} from './shared/storage/index.ts';

// Where the API and its auth router are mounted (docs/api/api-contract.md §1); the refresh cookie
// is scoped to the auth router's path, and the recovery cookie to its password routes.
const API_BASE = '/api/v1';
const AUTH_PATH = '/auth';
const PASSWORD_PATH = '/password';

// Where the local storage serves its own files, in development and the tests (conventions §12):
// under the API, so the web's proxy reaches them at its own origin.
const FILES_PATH = '/files';
export const LOCAL_FILES_URL = `${API_BASE}${FILES_PATH}`;
// apps/api/.storage, git-ignored, from src/ and from dist/ alike.
const LOCAL_STORAGE_ROOT = fileURLToPath(new URL('../.storage/', import.meta.url));

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

  app.use(API_BASE, apiRouter);
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
  /** Where files are stored for this environment (STORAGE_MODE). */
  storage: Storage;
  logger: Logger;
  /** The one clock every rule reads (conventions §11). Tests pass a fixed one. */
  clock?: () => Date;
  /** The timer every wait uses (conventions §11). Tests pass one that waits no real time. */
  wait?: (ms: number) => Promise<void>;
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
  storage,
  logger,
  clock = () => new Date(),
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: ApiOptions): Router {
  const limiter = createLimiter(createCounter(), clock);
  const accessTokens = createAccessTokens(jwtSecret);
  const cookies = createSessionCookies({ secure: secureCookies, path: `${API_BASE}${AUTH_PATH}` });
  const recoveryCookie = createRecoveryCookie({
    secure: secureCookies,
    path: `${API_BASE}${AUTH_PATH}${PASSWORD_PATH}`,
  });

  const runInTransaction = createRunInTransaction();

  const sessions = createSessionsService({ now: clock });
  const users = createUsersService({
    accessTokens,
    limiter,
    audit: writeAudit,
    now: clock,
    sessions,
    runInTransaction,
  });
  // The guard reads the account on every signed-in request (ADR 0003, revised).
  const requireAuth = createRequireAuth(accessTokens, (userId) => users.signedInAccount(userId));
  const lookups = createLookupsService();
  const governorates = createGovernoratesService({ runInTransaction, audit: writeAudit });
  const areas = createAreasService({ runInTransaction, audit: writeAudit });
  const amenities = createAmenitiesService({ runInTransaction, audit: writeAudit });
  const catalogue = createCatalogueService();
  const platformSettings = createPlatformSettingsService();
  const spaceSettings = createSpaceSettingsService();
  const spaces = createSpacesService();
  const adminSpaces = createAdminSpacesService({
    listing: createListingService({ platformSettings, now: clock }),
    lookups,
    users,
  });
  const space = createSpaceService({
    runInTransaction,
    audit: writeAudit,
    lookups,
    platformSettings,
    spaceSettings,
    ownersFor: (spaceId: number, tx?: Tx) => adminSpaces.ownersFor(spaceId, tx),
    now: clock,
  });
  // The space's fact groups, each saved alone, through one save path.
  const facts = {
    runInTransaction,
    audit: writeAudit,
    platformSettings,
    ownersFor: (spaceId: number, tx?: Tx) => adminSpaces.ownersFor(spaceId, tx),
    now: clock,
  };
  const profile = createProfileService({ ...facts, lookups });
  const hours = createHoursService(facts);
  const prices = createPricesService(facts);
  const spaceAmenities = createSpaceAmenitiesService({ ...facts, lookups });
  const contacts = createContactsService(facts);
  const confirm = createConfirmService(facts);
  const photos = createPhotosService({ runInTransaction, audit: writeAudit, storage, logger });
  const spaceLinks = createSpaceLinksService({ spaces, lookups });
  const directory = createDirectoryService({
    lookups,
    spaceLinks,
    publicListing: createPublicListingService({ platformSettings, now: clock, storage }),
    publicSpace: createPublicSpaceService({
      runInTransaction,
      platformSettings,
      now: clock,
      storage,
    }),
  });
  const adminUsers = createAdminUsersService({ users, spaces });
  const adminRoles = createAdminRolesService({ runInTransaction, users });
  const adminOwners = createAdminOwnersService({
    runInTransaction,
    audit: writeAudit,
    spaces,
    users,
    now: clock,
  });
  const auth = createAuthService({
    users,
    sessions,
    spaceLinks,
    accessTokens,
    limiter,
    runInTransaction,
    google,
    emailSender: createCappedEmailSender(email, { limiter, logger }),
    webOrigin,
    wait,
  });

  const api = Router();
  // The local storage's own files, before the general limit: a page of photos is many requests.
  if (storage.files) api.use(FILES_PATH, storage.files);
  api.use(
    limitRequests(limiter, async (req) => {
      const claims = await readAccessToken(req, accessTokens);
      return claims
        ? { policy: GENERAL_USER, by: [String(claims.userId)] }
        : { policy: GENERAL_GUEST, by: [clientAddress(req.ip)] };
    }),
  );
  api.use(
    AUTH_PATH,
    createAuthRouter(createAuthController(auth, cookies, recoveryCookie), webOrigin),
  );
  const usersController = createUsersController(users, cookies);
  api.use('/me', createUsersMeRouter(usersController, requireAuth));
  api.use('/lookups', createLookupsPublicRouter(createCatalogueController(catalogue)));
  api.use(createDirectoryPublicRouter(createDirectoryController(directory)));
  api.use(
    '/manage/spaces',
    createSpaceLinksMeRouter(createSpaceLinksController(spaceLinks), requireAuth),
  );

  // The platform's routes: guarded once here, so no module's admin router can leave it out.
  const admin = Router();
  admin.use(
    createLookupsAdminRouter({
      governorates: createGovernoratesController(governorates),
      areas: createAreasController(areas),
      amenities: createAmenitiesController(amenities),
    }),
  );
  // The space's links, without the refusal: can() reads whether the space is verified
  // (conventions §8, Space access).
  admin.use(
    '/spaces/:spaceId',
    loadSpaceLinks((spaceId, tx) => spaceLinks.linksAt(spaceId, tx)),
  );
  admin.use(
    createSpaceLinksAdminRouter({
      adminOwners: createAdminOwnersController(adminOwners),
      adminRoles: createAdminRolesController(adminRoles),
      adminSpaces: createAdminSpacesController(adminSpaces),
      adminUsers: createAdminUsersController(adminUsers),
    }),
  );
  admin.use(createUsersAdminRouter(usersController));
  admin.use(
    createSpacesAdminRouter({
      space: createSpaceController(space),
      profile: createProfileController(profile),
      hours: createHoursController(hours),
      prices: createPricesController(prices),
      amenities: createSpaceAmenitiesController(spaceAmenities),
      contacts: createContactsController(contacts),
      confirm: createConfirmController(confirm),
      photos: createPhotosController(photos),
      limiter,
    }),
  );
  api.use('/admin', requireAuth(), requireRole('ADMIN'), admin);
  return api;
}

/**
 * The application as the environment configures it: the one mapping from settings to ports, which
 * every entry calls (the local server, and online the function's thin entry; conventions §12).
 */
export function createAppFromEnv(
  env: Env,
  { logger, checkDatabase }: { logger: Logger; checkDatabase: () => Promise<boolean> },
) {
  return createApp({
    corsOrigin: env.CORS_ORIGIN,
    logger,
    checkDatabase,
    trustProxy: trustProxyOf(env),
    apiRouter: createApi({
      jwtSecret: env.JWT_SECRET,
      secureCookies: secureCookiesOf(env),
      google: env.GOOGLE_CLIENT_ID
        ? createGoogleIdentity({ clientId: env.GOOGLE_CLIENT_ID })
        : undefined,
      email:
        env.EMAIL.mode === 'smtp'
          ? createSmtpEmailSender(env.EMAIL.settings)
          : createLogEmailSender(logger),
      webOrigin: env.CORS_ORIGIN,
      storage:
        env.STORAGE.mode === 'cloudinary'
          ? createCloudinaryStorage({
              ...env.STORAGE.settings,
              // One account, one folder per environment (conventions §12).
              folder: `masaha/${env.NODE_ENV}`,
            })
          : createLocalStorage({ root: LOCAL_STORAGE_ROOT, urlBase: LOCAL_FILES_URL }),
      logger,
    }),
  });
}
