/** The state a route error shows. */
export type RouteErrorKind = 'offline' | 'error';

// What a browser says when it cannot fetch a module script (Chromium, Firefox, Safari), and what
// Vite says when it cannot fetch a chunk's stylesheet: the page's code did not arrive.
const CHUNK_LOAD_FAILURES = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
  'Unable to preload CSS',
];

/**
 * Offline when the browser reports no connection, or when a page's code could not be fetched; the
 * general error otherwise. The caller reads `navigator.onLine`, so this stays a pure function.
 */
export function classifyRouteError(error: unknown, online: boolean): RouteErrorKind {
  if (!online) {
    return 'offline';
  }
  if (
    error instanceof Error &&
    CHUNK_LOAD_FAILURES.some((failure) => error.message.includes(failure))
  ) {
    return 'offline';
  }
  return 'error';
}
