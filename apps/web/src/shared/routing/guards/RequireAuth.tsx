import { useSession } from '@shared/session';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { signInPath } from '../returnUrl';
import { sessionWait, wholeSession } from './sessionWait';

/** A route for signed-in users: a guest goes to sign-in, with the page to return to. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession(wholeSession);
  const location = useLocation();

  if (session.status === 'authenticated') {
    return children;
  }
  return sessionWait(session) ?? <Navigate replace to={signInPath(location)} />;
}
