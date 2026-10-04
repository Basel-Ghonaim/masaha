import { useSession, type SessionUser } from '@shared/session';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ForbiddenState } from '../states/ForbiddenState';
import { signInPath } from '../returnUrl';
import { sessionWait, wholeSession } from './sessionWait';

/**
 * A route for one of the global `roles`: a guest goes to sign-in, with the page to return to; a
 * signed-in user with another role sees the 403 state. The server still refuses what this hides.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: readonly SessionUser['role'][];
  children: ReactNode;
}) {
  const session = useSession(wholeSession);
  const location = useLocation();

  if (session.status === 'authenticated') {
    return roles.includes(session.user.role) ? children : <ForbiddenState />;
  }
  return sessionWait(session) ?? <Navigate replace to={signInPath(location)} />;
}
