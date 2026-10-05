import { useSession } from '@shared/session';
import type { ReactNode } from 'react';
import { matchPath, Navigate, useLocation } from 'react-router';
import { CHANGE_PASSWORD_PATH, changePasswordPath, RESET_PASSWORD_PATH } from '../returnUrl';

/**
 * Around every route (docs/frontend/architecture.md › Landing and guards): a signed-in user with a
 * temporary password to change goes to the change first, carrying the page they asked for. The
 * change page itself is exempt, and so is everything while no such session is held, so public
 * pages never wait for the restore. Signing out happens on the change page, and ends what the gate
 * holds. A reset link is exempt too: the reset settles the pending change itself, and carrying the
 * link would copy its token into the return URL.
 */
// The pages the gate lets through, matched as the router matches their routes: in any case, and
// with a trailing slash.
const EXEMPT = [CHANGE_PASSWORD_PATH, RESET_PASSWORD_PATH];

export function PasswordChangeGate({ children }: { children: ReactNode }) {
  const pending = useSession((session) => session.user?.mustChangePassword === true);
  const location = useLocation();
  const exempt = EXEMPT.some((path) => matchPath(path, location.pathname) !== null);

  if (pending && !exempt) {
    return <Navigate replace to={changePasswordPath(location)} />;
  }
  return children;
}
