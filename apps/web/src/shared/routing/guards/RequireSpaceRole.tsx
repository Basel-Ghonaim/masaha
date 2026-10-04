import type { SessionSpaceLink } from '@masaha/shared/space-links';
import { useSession } from '@shared/session';
import type { ReactNode } from 'react';
import { Navigate, useLocation, useParams } from 'react-router';
import { parseSpaceId } from '../dashboardPaths';
import { signInPath } from '../returnUrl';
import { ForbiddenState } from '../states/ForbiddenState';
import { NotFoundState } from '../states/NotFoundState';
import { sessionWait, wholeSession } from './sessionWait';

/**
 * A route of the space in the URL (`:spaceId`), for the `roles` allowed there. The role read is the
 * user's role at that space, from the session's active links, never the global role (ADR 0009). A
 * guest goes to sign-in, with the page to return to; an id that is not one gets the 404 state; a
 * space the user holds no active link to, or a role the route does not allow, gets the 403 state, in
 * place, never a silent redirect (ADR 0016). The server still refuses what this hides.
 */
export function RequireSpaceRole({
  roles,
  children,
}: {
  roles: readonly SessionSpaceLink['role'][];
  children: ReactNode;
}) {
  const session = useSession(wholeSession);
  const location = useLocation();
  const { spaceId } = useParams();

  if (session.status === 'authenticated') {
    const id = parseSpaceId(spaceId);
    if (id === undefined) {
      return <NotFoundState />;
    }
    const link = session.user.spaces.find((space) => space.spaceId === id);
    return link && roles.includes(link.role) ? children : <ForbiddenState />;
  }
  return sessionWait(session) ?? <Navigate replace to={signInPath(location)} />;
}
