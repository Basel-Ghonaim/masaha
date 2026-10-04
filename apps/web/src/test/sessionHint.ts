import { vi } from 'vitest';

// The session hint's cookie, as the server sets it (docs/backend/security.md › Tokens and cookies).
const HINT = 'masaha_session';

/**
 * Gives the unit lane, which runs in Node and has no `document`, a cookie jar that reads and writes
 * as the browser's does for a name, a value and `Max-Age=0`. The component lane has jsdom's own.
 * Restore it with `vi.unstubAllGlobals()`.
 */
export function stubCookies(): void {
  const jar = new Map<string, string>();
  vi.stubGlobal('document', {
    get cookie() {
      return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
    },
    set cookie(line: string) {
      const [pair = '', ...attributes] = line.split(';');
      const [name = '', value = ''] = pair.split('=');
      const expired = attributes.some((attribute) => /^\s*max-age=0\s*$/i.test(attribute));
      if (expired) jar.delete(name.trim());
      else jar.set(name.trim(), value);
    },
  });
}

/** Sets or removes the session hint, as the server's answers do. */
export function setSessionHint(present: boolean): void {
  document.cookie = present ? `${HINT}=1; Path=/` : `${HINT}=; Path=/; Max-Age=0`;
}

/** Whether the session hint is in the cookies. */
export function hasSessionHint(): boolean {
  return document.cookie.split(';').some((cookie) => cookie.trim().startsWith(`${HINT}=`));
}
