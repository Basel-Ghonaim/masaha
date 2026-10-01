import { pino, type Logger } from 'pino';
import request from 'supertest';

import { createApi, createApp, type ApiOptions } from '../src/app.ts';
import { hashPassword } from '../src/modules/users/index.ts';
import { createAccessTokens } from '../src/shared/auth/index.ts';
import { prisma } from '../src/db/index.ts';
import type { Prisma } from '../src/generated/prisma/client.ts';

export const TEST_JWT_SECRET = 'a-test-secret-of-at-least-32-characters';
export const accessTokens = createAccessTokens(TEST_JWT_SECRET);

/** The API as server.ts assembles it, with test settings. */
export function createTestApp(options: Partial<ApiOptions> & { logger?: Logger } = {}) {
  const { logger = pino({ level: 'silent' }), ...api } = options;
  return createApp({
    corsOrigin: 'http://localhost:5173',
    logger,
    checkDatabase: () => Promise.resolve(true),
    apiRouter: createApi({ jwtSecret: TEST_JWT_SECRET, secureCookies: false, ...api }),
  });
}

export const PASSWORD = 'gaza2026';

// bcrypt at cost 12 takes a while, so each password is hashed once per test file.
const hashes = new Map<string, Promise<string>>();

/** An account that signs in with `PASSWORD`, unless overridden. */
export async function createAccount(
  data: Partial<Prisma.UserUncheckedCreateInput> & { email?: string; password?: string } = {},
) {
  const { password = PASSWORD, email = 'sara@example.com', ...rest } = data;
  const passwordHash = hashes.get(password) ?? hashPassword(password);
  hashes.set(password, passwordHash);
  return prisma.user.create({
    data: { email, name: 'Sara', passwordHash: await passwordHash, ...rest },
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
