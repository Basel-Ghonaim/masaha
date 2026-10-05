import { resetTokenOf } from './resetTokenOf';

/**
 * Takes a reset link's token out of the address bar (docs/backend/security.md › Passwords): reads it
 * from the fragment, and replaces the address with one without the fragment, at once, before any
 * request can be sent. The history entry keeps its state, so the router's place in it is kept.
 * Nothing, and the address untouched, when the fragment carries no token.
 */
export function takeResetToken(): string | null {
  const { pathname, search, hash } = window.location;
  const token = resetTokenOf(hash);
  if (token !== null) {
    window.history.replaceState(window.history.state, '', `${pathname}${search}`);
  }
  return token;
}
