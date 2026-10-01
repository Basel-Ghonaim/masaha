import type { CookieOptions, Request, Response } from 'express';

import { REFRESH_TOKEN_TTL_MS } from './sessions.service.ts';

// docs/backend/security.md › Tokens and cookies.
export const REFRESH_COOKIE = 'masaha_refresh';
export const SESSION_HINT_COOKIE = 'masaha_session';

/**
 * The session's two cookies, each set and cleared from one options object. The refresh token is
 * HttpOnly and reaches only the auth routes. The hint holds no secret: it tells the web, which can
 * read it, that a refresh is worth trying.
 */
export function createSessionCookies({ secure }: { secure: boolean }) {
  const refresh: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: REFRESH_TOKEN_TTL_MS,
  };
  const hint: CookieOptions = {
    httpOnly: false,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: REFRESH_TOKEN_TTL_MS,
  };

  return {
    set(res: Response, refreshToken: string) {
      res.cookie(REFRESH_COOKIE, refreshToken, refresh);
      res.cookie(SESSION_HINT_COOKIE, '1', hint);
    },

    clear(res: Response) {
      res.clearCookie(REFRESH_COOKIE, refresh);
      res.clearCookie(SESSION_HINT_COOKIE, hint);
    },

    read(req: Request): string | undefined {
      const value: unknown = (req.cookies as Record<string, unknown>)[REFRESH_COOKIE];
      return typeof value === 'string' && value !== '' ? value : undefined;
    },
  };
}

export type SessionCookies = ReturnType<typeof createSessionCookies>;
