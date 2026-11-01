import type { SessionSpaceLink } from '@masaha/shared/space-links';
import type { Catalogue } from '@shared/copy';
import { DASHBOARD_PATHS, spaceOverviewPath } from '@shared/routing';

/** A dashboard page, named as the catalogue names its title. */
export type DashboardPageName = keyof Catalogue['dashboard']['pages'];

/** A task the sidebar groups its pages by (finding 165); each is named by the catalogue. */
export type NavGroup = keyof Catalogue['dashboard']['groups'];

/**
 * A page of a branch: its name, its path below the branch ('' for the branch's own page), and the
 * task it is grouped under. A page with no group heads the list.
 */
export type NavItem = { name: DashboardPageName; segment: string; group?: NavGroup };

/** A page of the space in the URL, and the roles at that space it allows (ADR 0009). */
export type SpaceNavItem = NavItem & { roles: readonly SessionSpaceLink['role'][] };

const OWNER = ['OWNER'] as const;
const BOTH = ['OWNER', 'RECEPTION'] as const;

/**
 * The space's pages, in the sidebar's order and grouped by task: the owner sees twelve, reception the
 * four its role allows (drawn without the groups, P3). Configuration only: the routes are built from
 * it, and each route's guard takes its roles. The owner's audit log sits with the team and the
 * settings (O13, finding 14).
 */
export const SPACE_NAV: readonly SpaceNavItem[] = [
  { name: 'overview', segment: '', roles: OWNER },
  { name: 'desk', segment: 'desk', roles: BOTH, group: 'today' },
  { name: 'customers', segment: 'customers', roles: BOTH, group: 'today' },
  { name: 'payments', segment: 'payments', roles: OWNER, group: 'today' },
  { name: 'myPayments', segment: 'my-payments', roles: ['RECEPTION'], group: 'today' },
  { name: 'finance', segment: 'finance', roles: OWNER, group: 'money' },
  { name: 'packages', segment: 'packages', roles: OWNER, group: 'money' },
  { name: 'profile', segment: 'profile', roles: OWNER, group: 'space' },
  { name: 'announcements', segment: 'announcements', roles: BOTH, group: 'space' },
  { name: 'dataReports', segment: 'reports', roles: OWNER, group: 'space' },
  { name: 'staff', segment: 'staff', roles: OWNER, group: 'team' },
  { name: 'audit', segment: 'audit', roles: OWNER, group: 'team' },
  { name: 'settings', segment: 'settings', roles: OWNER, group: 'team' },
];

/** The page `name` of the space `spaceId`, by its segment below the space's own path. */
export function spacePagePath(spaceId: number, name: DashboardPageName): string {
  const segment = SPACE_NAV.find((item) => item.name === name)?.segment ?? '';
  const base = spaceOverviewPath(spaceId);
  return segment === '' ? base : `${base}/${segment}`;
}

/** A customer's file, below the space's customers list: reached from it, never a sidebar item. */
export const SPACE_CUSTOMER_PATH = `${DASHBOARD_PATHS.space}/customers/:customerId`;

/** The file of the customer `customerId` of the space `spaceId`. */
export function spaceCustomerPath(spaceId: number, customerId: number): string {
  return SPACE_CUSTOMER_PATH.replace(':spaceId', String(spaceId)).replace(
    ':customerId',
    String(customerId),
  );
}

/**
 * The admin's spaces list and its sub-pages, by path. The add page and a space's editor are reached
 * from the list and belong to it: neither is a sidebar item, so the list's item stays current there.
 */
export const ADMIN_SPACES_PATH = `${DASHBOARD_PATHS.admin}/spaces`;
export const ADMIN_ADD_SPACE_PATH = `${ADMIN_SPACES_PATH}/new`;
/** The spaces list showing the deleted spaces, where a deleted space is restored. */
export const ADMIN_DELETED_SPACES_PATH = `${ADMIN_SPACES_PATH}?status=deleted`;
/** A space's editor, reached from the list and after a creation; never a sidebar item either. */
export const ADMIN_SPACE_PATH = `${ADMIN_SPACES_PATH}/:spaceId`;

/** The editor of the space `spaceId`. */
export function adminSpacePath(spaceId: number): string {
  return ADMIN_SPACE_PATH.replace(':spaceId', String(spaceId));
}

/** The owners page, where an owner with no account is added before a space is linked to them. */
export const ADMIN_OWNERS_PATH = `${DASHBOARD_PATHS.admin}/owners`;

/** The owners page searched for `q`, such as a person's email: their row, and its unlinks. */
export function adminOwnersSearchPath(q: string): string {
  return `${ADMIN_OWNERS_PATH}?q=${encodeURIComponent(q)}`;
}

/** The lookups page on its amenities' tab, where an amenity is added to every space's list. */
export const ADMIN_AMENITIES_PATH = `${DASHBOARD_PATHS.admin}/lookups?tab=amenities`;

/**
 * The platform's pages, in the sidebar's order and grouped by task, all the admin's. The platform's
 * settings are named as such (AD-029); their address stays `…/settings`.
 */
export const ADMIN_NAV: readonly NavItem[] = [
  { name: 'overview', segment: '' },
  { name: 'spaces', segment: 'spaces', group: 'spaces' },
  { name: 'owners', segment: 'owners', group: 'spaces' },
  { name: 'dataReports', segment: 'reports', group: 'spaces' },
  { name: 'users', segment: 'users', group: 'platform' },
  { name: 'lookups', segment: 'lookups', group: 'platform' },
  { name: 'audit', segment: 'audit', group: 'platform' },
  { name: 'platformSettings', segment: 'settings', group: 'platform' },
];
