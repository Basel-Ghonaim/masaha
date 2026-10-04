/** Where sign-in lives (docs/frontend/architecture.md §2). */
export const SIGN_IN_PATH = '/login';

/** The query parameter that carries the page to return to after signing in. */
const RETURN_PARAMETER = 'next';

/** The sign-in page, carrying the page the guest asked for so they return to it. */
export function signInPath({
  pathname,
  search,
  hash,
}: {
  pathname: string;
  search: string;
  hash: string;
}): string {
  const parameters = new URLSearchParams({ [RETURN_PARAMETER]: `${pathname}${search}${hash}` });
  return `${SIGN_IN_PATH}?${parameters.toString()}`;
}

// A stand-in origin to resolve the return URL against: whatever leaves it leaves the site.
const SITE = 'https://site.invalid';

/**
 * The page to return to, from a query string, when it names one on this site. Only a path on this
 * site is accepted, read as a browser reads it: `//host`, `/\host` or a full URL would leave the
 * site, and so would a path that only becomes `//host` once resolved (`/.//host`, `/..//host`), so a
 * crafted link cannot send a user elsewhere. Nothing when there is none, or it is not safe.
 */
export function returnUrlOf(search: string): string | undefined {
  const target = new URLSearchParams(search).get(RETURN_PARAMETER);
  if (!target?.startsWith('/')) {
    return undefined;
  }
  const url = new URL(target, SITE);
  const leaves =
    url.origin !== SITE || url.pathname.startsWith('//') || url.pathname.startsWith('/\\');
  return leaves ? undefined : `${url.pathname}${url.search}${url.hash}`;
}

/** The page to return to, from a query string, or `/` (`returnUrlOf`). */
export function safeReturnUrl(search: string): string {
  return returnUrlOf(search) ?? '/';
}
