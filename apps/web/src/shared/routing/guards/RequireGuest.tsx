import { useSession } from '@shared/session';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { landingPath } from '../landing/landingPath';
import { sessionWait, wholeSession } from './sessionWait';

/**
 * A route for guests only, such as sign-in: a signed-in user goes on by the landing rule, to the page
 * they came for, else their dashboard, else home (docs/frontend/architecture.md › Landing and
 * guards). Signing in on such a page lands here too, so the landing has this one owner.
 */
export function RequireGuest({ children }: { children: ReactNode }) {
  const session = useSession(wholeSession);
  const location = useLocation();

  if (session.status === 'anonymous') {
    return children;
  }
  if (session.status === 'authenticated') {
    return <Navigate replace to={landingPath(session.user, location.search)} />;
  }
  return sessionWait(session);
}
