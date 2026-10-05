import { useSession } from '@shared/session';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { landingPath } from '../landing/landingPath';
import { SIGN_IN_PATH } from '../returnUrl';
import { sessionWait, wholeSession } from './sessionWait';

/**
 * The password change's route: a signed-in user with a temporary password to change. Once the
 * change clears it, the user goes on where they land (`landingPath`): the page they asked for, else
 * by their role. So the landing after the change has this one owner, and the page passes no
 * callback. A guest, such as one who has just signed out here, goes to sign-in.
 */
export function RequirePasswordChange({ children }: { children: ReactNode }) {
  const session = useSession(wholeSession);
  const location = useLocation();

  if (session.status === 'authenticated') {
    return session.user.mustChangePassword ? (
      children
    ) : (
      <Navigate replace to={landingPath(session.user, location.search)} />
    );
  }
  return sessionWait(session) ?? <Navigate replace to={SIGN_IN_PATH} />;
}
