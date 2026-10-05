import type { CookieOptions, Request, Response } from 'express';

// docs/backend/security.md › Tokens and cookies.
export const RECOVERY_COOKIE = 'masaha_reset';

/**
 * The cookie that holds a recovery's key: HttpOnly, so the web never reads it, and set and cleared
 * from one options object. It lives as long as the recovery, which lives as long as its reset link.
 * `path` is where the composition root mounts the password routes: the cookie goes there only.
 */
export function createRecoveryCookie({ secure, path }: { secure: boolean; path: string }) {
  const options: CookieOptions = { httpOnly: true, secure, sameSite: 'strict', path };

  return {
    set(res: Response, key: string, maxAgeMs: number) {
      res.cookie(RECOVERY_COOKIE, key, { ...options, maxAge: maxAgeMs });
    },
    clear(res: Response) {
      res.clearCookie(RECOVERY_COOKIE, options);
    },
    read(req: Request): string | undefined {
      const value: unknown = (req.cookies as Record<string, unknown>)[RECOVERY_COOKIE];
      return typeof value === 'string' && value !== '' ? value : undefined;
    },
  };
}

export type RecoveryCookie = ReturnType<typeof createRecoveryCookie>;
