/**
 * Loads the page again. Retrying a route needs a reload: React Router keeps a page's failed lazy
 * load for that route, and a browser may keep a failed module fetch, so only a fresh page fetches
 * the code again. Its own module, so a test can stand in for it.
 */
export function reloadPage(): void {
  window.location.reload();
}
