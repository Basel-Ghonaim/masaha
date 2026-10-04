import { useSession } from '@shared/session';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { safeReturnUrl } from './returnUrl';
import { sessionWait, wholeSession } from './sessionWait';

/**
 * A route for guests only, such as sign-in: a signed-in user goes on to the page they came for, or
 * home (docs/frontend/architecture.md › Landing and guards).
 */
export function RequireGuest({ children }: { children: ReactNode }) {
  const session = useSession(wholeSession);
  const location = useLocation();

  if (session.status === 'anonymous') {
    return children;
  }
  if (session.status === 'authenticated') {
    return <Navigate replace to={safeReturnUrl(location.search)} />;
  }
  return sessionWait(session);
}
