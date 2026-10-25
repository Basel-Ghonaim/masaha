import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { pino } from 'pino';
import request from 'supertest';

import { createApi, createApp, LOCAL_FILES_URL, type ApiOptions } from '../src/app.ts';
import type { EmailMessage, EmailSender } from '../src/modules/auth/index.ts';
import { hashPassword } from '../src/modules/users/index.ts';
import { createAccessTokens } from '../src/shared/auth/index.ts';
import { createLocalStorage } from '../src/shared/storage/index.ts';
import { prisma } from '../src/db/index.ts';
import type { Prisma } from '../src/generated/prisma/client.ts';

export const TEST_JWT_SECRET = 'a-test-secret-of-at-least-32-characters';
export const accessTokens = createAccessTokens(TEST_JWT_SECRET);

/** Far enough ahead that no test's clock passes it. */
const FAR_AHEAD = new Date('2100-01-01T00:00:00Z');

/**
 * An access token for the user, signed for a new session of theirs, as a sign-in makes one: a
 * refresh-token family of one row, which never ends. A test of the session's own rules signs in
 * through the API instead, so its clock dates the session.
 */
export async function signAccess(
  userId: number,
  { mustChangePassword = false, sessionVersion = 0 } = {},
): Promise<string> {
  const row = await prisma.refreshToken.create({
    data: {
      userId,
      familyId: 0,
      tokenHash: randomUUID(),
      expiresAt: FAR_AHEAD,
      sessionEndsAt: FAR_AHEAD,
    },
    select: { id: true },
  });
  await prisma.refreshToken.update({ where: { id: row.id }, data: { familyId: row.id } });
  return accessTokens.sign({ userId, mustChangePassword, sessionVersion, sessionId: row.id });
}

export const WEB_ORIGIN = 'http://localhost:5173';

/** An email sender that keeps what it is given, for the test to read. */
export function recordingEmailSender(): EmailSender & { sent: EmailMessage[] } {
  const sent: EmailMessage[] = [];
  return {
    sent,
    send(message) {
      sent.push(message);
      return Promise.resolve({ sent: true });
    },
  };
}

/** The API as server.ts assembles it, with test settings. */
export function createTestApp(options: Partial<ApiOptions> = {}) {
  const { logger = pino({ level: 'silent' }), ...api } = options;
  return createApp({
    corsOrigin: WEB_ORIGIN,
    logger,
    checkDatabase: () => Promise.resolve(true),
    apiRouter: createApi({
      jwtSecret: TEST_JWT_SECRET,
      secureCookies: false,
      email: recordingEmailSender(),
      webOrigin: WEB_ORIGIN,
      // A file a test stores and does not look at lands in the system's temporary folder.
      storage: createLocalStorage({
        root: path.join(tmpdir(), 'masaha-api-test-storage'),
        urlBase: LOCAL_FILES_URL,
      }),
      logger,
      ...api,
    }),
  });
}

export const PASSWORD = 'gaza2026';

// bcrypt at cost 12 takes a while, so each password is hashed once per test file.
const hashes = new Map<string, Promise<string>>();

/** A week from now: a pending temporary password's expiry, as an issue sets it. */
export function inAWeek(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60_000);
}

/**
 * An account that signs in with `PASSWORD`, unless overridden. A pending temporary password gets
 * an expiry a week ahead unless one is given: the database refuses one without (S4).
 */
export async function createAccount(
  data: Partial<Prisma.UserUncheckedCreateInput> & { email?: string; password?: string } = {},
) {
  const { password = PASSWORD, email = 'sara@example.com', ...rest } = data;
  const passwordHash = hashes.get(password) ?? hashPassword(password);
  hashes.set(password, passwordHash);
  const expiry =
    rest.mustChangePassword && rest.temporaryPasswordExpiresAt === undefined
      ? { temporaryPasswordExpiresAt: inAWeek() }
      : {};
  return prisma.user.create({
    data: { email, name: 'Sara', passwordHash: await passwordHash, ...expiry, ...rest },
  });
}

/** The cookies a response sets, by name, with their attributes. */
export function setCookies(response: request.Response): Record<string, string> {
  const header = response.headers['set-cookie'] as unknown as string[] | undefined;
  return Object.fromEntries(
    (header ?? []).map((cookie) => [cookie.slice(0, cookie.indexOf('=')), cookie]),
  );
}

/** The value of a cookie a response sets. */
export function cookieValue(response: request.Response, name: string): string | undefined {
  const cookie = setCookies(response)[name];
  return cookie?.slice(name.length + 1, cookie.indexOf(';'));
}
