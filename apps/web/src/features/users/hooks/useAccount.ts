import { useCopy } from '@shared/copy';
import { isolate } from '@shared/localisation';
import { hasDashboard } from '@shared/routing';
import type { SessionUser } from '@shared/session';
import { useSignOutAction } from './useSignOutAction';

/**
 * The signed-in user's account, ready to render: the names the menu shows, the avatar's initial,
 * whether it leads to the dashboard, and the server-confirmed sign-out with its pending state and its
 * failure as text.
 */
export function useAccount(user: SessionUser) {
  const copy = useCopy();
  const signOut = useSignOutAction();
  const name = user.name.trim();

  return {
    name,
    /** The name's first word, as the header shows it. */
    firstName: name.split(/\s+/u)[0] ?? name,
    /** The name's first character, the avatar's initial. */
    initial: Array.from(name)[0] ?? '',
    email: user.email,
    /** The account button's accessible name. */
    menuLabel: copy.users.menu({ name: isolate(name) }),
    sectionLabel: copy.users.section,
    /** Whether the user has a dashboard to go to (the landing rule's `hasDashboard`). */
    showsDashboard: hasDashboard(user),
    dashboardLabel: copy.users.dashboard,
    ...signOut,
  };
}
