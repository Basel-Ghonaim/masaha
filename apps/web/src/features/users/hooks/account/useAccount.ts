import { useCopy, type Catalogue } from '@shared/copy';
import { isolate } from '@shared/localisation';
import { hasDashboard } from '@shared/routing';
import type { SessionUser } from '@shared/session';
import { useSignOutAction } from '../sign-out/useSignOutAction';

/** A link of the account menu to one of the account's pages, as the site routes it (P4). */
export type AccountMenuLink = { key: keyof Catalogue['users']['account']['links']; to: string };

/**
 * The signed-in user's account, ready to render: the names the menu shows, the avatar's initial,
 * the links to the account's pages the shell passes (the site's; the dashboard passes none), whether
 * it leads to the dashboard, and the server-confirmed sign-out with its pending state and its failure
 * as text. `role` is the word the dashboard's shells put beside the name (P4, DI27): the role at the
 * space in the URL, or the admin's; the site passes none.
 */
export function useAccount(
  user: SessionUser,
  links: readonly AccountMenuLink[] = [],
  role?: string,
) {
  const copy = useCopy();
  const signOut = useSignOutAction();
  const name = user.name.trim();

  return {
    name,
    /** The menu's label: the name, with the role beside it when the shell passes one. */
    label: role === undefined ? name : copy.users.nameWithRole({ name, role }),
    /** The name's first word, as the header shows it. */
    firstName: name.split(/\s+/u)[0] ?? name,
    /** The name's first character, the avatar's initial. */
    initial: Array.from(name)[0] ?? '',
    email: user.email,
    /** The account button's accessible name. */
    menuLabel: copy.users.menu({ name: isolate(name) }),
    sectionLabel: copy.users.section,
    /** The account's pages, each worded, in the order passed. */
    links: links.map((link) => ({ ...link, label: copy.users.account.links[link.key] })),
    /** Whether the user has a dashboard to go to (the landing rule's `hasDashboard`). */
    showsDashboard: hasDashboard(user),
    dashboardLabel: copy.users.dashboard,
    publicSiteLabel: copy.users.publicSite,
    settingsLabel: copy.users.account.links.settings,
    ...signOut,
  };
}
