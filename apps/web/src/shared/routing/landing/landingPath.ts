import type { SessionUser } from '@shared/session';
import { DASHBOARD_PATHS, spaceDeskPath, spaceOverviewPath } from '../dashboardPaths';
import { returnUrlOf } from '../returnUrl';
import { lastSpace } from './lastSpace';

/**
 * Where a signed-in user lands (docs/frontend/architecture.md › Landing and guards), from the page's
 * query string:
 * 1. the safe return URL in `next` (`returnUrlOf`), when there is one, an explicit `/` included;
 * 2. else the admin's overview, for an ADMIN;
 * 3. else the space the user opened last, or their oldest active link when that space is not
 *    remembered or no longer theirs, on the page their role there gives: the overview for an OWNER,
 *    the front desk for RECEPTION;
 * 4. else home.
 */
export function landingPath(user: SessionUser, search: string): string {
  const back = returnUrlOf(search);
  if (back !== undefined) {
    return back;
  }
  if (user.role === 'ADMIN') {
    return DASHBOARD_PATHS.admin;
  }
  const link = lastSpace(user) ?? user.spaces[0];
  if (link) {
    return link.role === 'OWNER' ? spaceOverviewPath(link.spaceId) : spaceDeskPath(link.spaceId);
  }
  return '/';
}
