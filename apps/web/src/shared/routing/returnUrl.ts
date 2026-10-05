/** Where sign-in lives (docs/frontend/architecture.md §2). */
export const SIGN_IN_PATH = '/login';

/** The query parameter that carries the page to return to after signing in. */
const RETURN_PARAMETER = 'next';

/** Where a temporary password is changed, before any other page (docs/frontend/architecture.md §2). */
export const CHANGE_PASSWORD_PATH = '/change-password';

/**
 * Where a reset link opens, its token in the fragment (docs/frontend/architecture.md §2). No guard
 * wraps it and the gate lets it through, so the fragment never travels into a return URL.
 */
export const RESET_PASSWORD_PATH = '/reset-password';

type Place = { pathname: string; search: string; hash: string };

/** `path`, carrying `place` as the page to return to. */
function returningTo(path: string, { pathname, search, hash }: Place): string {
  const parameters = new URLSearchParams({ [RETURN_PARAMETER]: `${pathname}${search}${hash}` });
  return `${path}?${parameters.toString()}`;
}

/** The sign-in page, carrying the page the guest asked for so they return to it. */
export function signInPath(place: Place): string {
  return returningTo(SIGN_IN_PATH, place);
}

/** The password change, carrying the page the user asked for so they go on to it once it is done. */
export function changePasswordPath(place: Place): string {
  return returningTo(CHANGE_PASSWORD_PATH, place);
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
