import { landingPath } from '@shared/routing';
import { useSession } from '@shared/session';
import { Navigate } from 'react-router';

/**
 * `/dashboard`: sends the signed-in user to their own dashboard by the landing rule, or home when
 * they have none (docs/frontend/architecture.md › Landing and guards).
 */
export function DashboardLanding() {
  const user = useSession((session) => session.user);

  return user && <Navigate replace to={landingPath(user, '')} />;
}
