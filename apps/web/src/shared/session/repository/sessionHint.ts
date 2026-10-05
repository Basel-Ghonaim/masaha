/**
 * The session hint: a cookie the server sets beside the refresh cookie, readable here and holding no
 * secret, so a guest's page never asks for a refresh (docs/backend/security.md › Tokens and cookies).
 */
export interface SessionHint {
  isPresent: () => boolean;
  clear: () => void;
}

// The only place that knows the cookie's name.
const NAME = 'masaha_session';

/** The hint in the browser's cookies. */
export const cookieSessionHint: SessionHint = {
  isPresent: () =>
    document.cookie.split(';').some((cookie) => cookie.trim().startsWith(`${NAME}=`)),
  clear: () => {
    // The server sets it on Path=/; the same path removes it.
    document.cookie = `${NAME}=; Path=/; Max-Age=0`;
  },
};
