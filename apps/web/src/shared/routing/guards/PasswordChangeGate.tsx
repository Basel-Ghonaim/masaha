import { useSession } from '@shared/session';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { CHANGE_PASSWORD_PATH, changePasswordPath } from '../returnUrl';

/**
 * Around every route (docs/frontend/architecture.md › Landing and guards): a signed-in user with a
 * temporary password to change goes to the change first, carrying the page they asked for. The
 * change page itself is exempt, and so is everything while no such session is held, so public
 * pages never wait for the restore. Signing out happens on the change page, and ends what the gate
 * holds.
 */
export function PasswordChangeGate({ children }: { children: ReactNode }) {
  const pending = useSession((session) => session.user?.mustChangePassword === true);
  const location = useLocation();

  if (pending && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate replace to={changePasswordPath(location)} />;
  }
  return children;
}
