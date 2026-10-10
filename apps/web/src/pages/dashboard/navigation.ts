import type { SessionSpaceLink } from '@masaha/shared/space-links';
import type { Catalogue } from '@shared/copy';
import { DASHBOARD_PATHS } from '@shared/routing';

/** A dashboard page, named as the catalogue names its title. */
export type DashboardPageName = keyof Catalogue['dashboard']['pages'];

/** A page of a branch: its name, and its path below the branch ('' for the branch's own page). */
export type NavItem = { name: DashboardPageName; segment: string };

/** A page of the space in the URL, and the roles at that space it allows (ADR 0009). */
export type SpaceNavItem = NavItem & { roles: readonly SessionSpaceLink['role'][] };

const OWNER = ['OWNER'] as const;
const BOTH = ['OWNER', 'RECEPTION'] as const;

/**
 * The space's pages, in the sidebar's order: the owner sees eleven, reception the four its role
 * allows. Configuration only: the routes are built from it, and each route's guard takes its roles.
 */
export const SPACE_NAV: readonly SpaceNavItem[] = [
  { name: 'overview', segment: '', roles: OWNER },
  { name: 'desk', segment: 'desk', roles: BOTH },
  { name: 'customers', segment: 'customers', roles: BOTH },
  { name: 'payments', segment: 'payments', roles: OWNER },
  { name: 'myPayments', segment: 'my-payments', roles: ['RECEPTION'] },
  { name: 'finance', segment: 'finance', roles: OWNER },
  { name: 'packages', segment: 'packages', roles: OWNER },
  { name: 'profile', segment: 'profile', roles: OWNER },
  { name: 'announcements', segment: 'announcements', roles: BOTH },
  { name: 'dataReports', segment: 'reports', roles: OWNER },
  { name: 'staff', segment: 'staff', roles: OWNER },
  { name: 'settings', segment: 'settings', roles: OWNER },
];

/**
 * The admin's spaces list and its add page, by path. The add page is reached from the list and
 * belongs to it: it is never a sidebar item, so the list's item stays current there.
 */
export const ADMIN_SPACES_PATH = `${DASHBOARD_PATHS.admin}/spaces`;
export const ADMIN_ADD_SPACE_PATH = `${ADMIN_SPACES_PATH}/new`;

/** The platform's pages, in the sidebar's order, all the admin's. */
export const ADMIN_NAV: readonly NavItem[] = [
  { name: 'overview', segment: '' },
  { name: 'spaces', segment: 'spaces' },
  { name: 'owners', segment: 'owners' },
  { name: 'dataReports', segment: 'reports' },
  { name: 'users', segment: 'users' },
  { name: 'lookups', segment: 'lookups' },
  { name: 'audit', segment: 'audit' },
  { name: 'settings', segment: 'settings' },
];
