// The development server's port and the API it forwards /api to (ADR 0014), read from the folder's
// own apps/web/.env so that a second folder, such as a worktree, runs beside the first
// (docs/development/setup.md › Running a second folder).

const DEFAULT_PORT = '5320';
const DEFAULT_API = 'http://localhost:3320';

/**
 * The server settings for `WEB_PORT` and `API_PROXY_TARGET`, an empty value counting as unset. The
 * port is plain decimal digits. A value that is not a port or an http address throws, naming its
 * key, rather than leaving Vite to guess; vite.config.ts reads it, so it fails the dev server,
 * `vite build` and the Vitest lanes alike.
 */
export function devServer(env: Record<string, string>) {
  const value = env.WEB_PORT || DEFAULT_PORT;
  const port = Number(value);
  if (!/^\d+$/.test(value) || port < 1 || port > 65535) {
    throw new Error(`WEB_PORT must be a port from 1 to 65535 in decimal digits, not "${value}"`);
  }
  const api = env.API_PROXY_TARGET || DEFAULT_API;
  const protocol = URL.parse(api)?.protocol;
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error(`API_PROXY_TARGET must be an http address, not "${api}"`);
  }
  return { port, strictPort: true, proxy: { '/api': api } };
}
