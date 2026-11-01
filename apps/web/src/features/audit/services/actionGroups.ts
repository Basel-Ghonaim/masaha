import { AUDIT_ACTIONS, type AuditAction } from '@masaha/shared/audit';
import type { AuditScope } from '../types/AuditScope';

/** The owner's groups of actions, in the filter's order (DI17). */
export const SPACE_GROUPS = [
  'payments',
  'visits',
  'checkIns',
  'customers',
  'subscriptions',
  'packages',
  'announcements',
  'space',
  'staff',
  'settings',
  'reports',
] as const;

/** The admin's groups of actions, in the filter's order (DI17). */
export const PLATFORM_GROUPS = [
  'spaces',
  'owners',
  'accounts',
  'lookups',
  'reports',
  'platformSettings',
] as const;

export type SpaceGroup = (typeof SPACE_GROUPS)[number];
export type PlatformGroup = (typeof PLATFORM_GROUPS)[number];
export type AuditGroup = SpaceGroup | PlatformGroup;

const startingWith = (...prefixes: string[]): AuditAction[] =>
  AUDIT_ACTIONS.filter((action) => prefixes.some((prefix) => action.startsWith(prefix)));

const named = (...actions: string[]): AuditAction[] =>
  AUDIT_ACTIONS.filter((action) => actions.includes(action));

// A space's facts and photos: its creation, each fact group's save and confirmation, its photos,
// its hiding, deletion and restoring.
const FACT_GROUPS = ['profile', 'hours', 'prices', 'amenities', 'contacts'];
const SPACE_FACTS = named(
  'space.created',
  ...FACT_GROUPS.flatMap((group) => [`space.${group}Edited`, `space.${group}Confirmed`]),
  'space.photoAdded',
  'space.photoRemoved',
  'space.photosReordered',
  'space.hidden',
  'space.unhidden',
  'space.deleted',
  'space.restored',
);
const OWNERS = named('space.ownerLinked', 'space.ownerUnlinked');

const SPACE: Record<SpaceGroup, readonly AuditAction[]> = {
  payments: startingWith('payment.'),
  visits: startingWith('visit.'),
  checkIns: startingWith('checkIn.'),
  customers: startingWith('customer.'),
  subscriptions: startingWith('subscription.', 'closure.subscriptionsExtended'),
  packages: startingWith('package.'),
  announcements: startingWith('announcement.'),
  space: [...SPACE_FACTS, ...OWNERS],
  staff: [
    ...startingWith('space.staff'),
    ...named('user.created', 'user.emailChanged'),
    ...startingWith('user.temporaryPassword'),
  ],
  settings: named(
    'space.settingsEdited',
    'space.capacityEdited',
    'space.statusOverridden',
    'space.statusOverrideCleared',
  ),
  reports: startingWith('dataReport.'),
};

const PLATFORM: Record<PlatformGroup, readonly AuditAction[]> = {
  spaces: SPACE_FACTS,
  owners: OWNERS,
  accounts: startingWith('user.').filter((action) => action !== 'user.profileEdited'),
  lookups: startingWith('governorate.', 'area.', 'amenity.'),
  reports: startingWith('dataReport.'),
  platformSettings: startingWith('platformSettings.'),
};

/** The scope's groups, in the filter's order. */
export function groupsOf(scope: AuditScope): readonly AuditGroup[] {
  return scope === 'space' ? SPACE_GROUPS : PLATFORM_GROUPS;
}

/** A group of the scope by its name in the address, else none. */
export function groupOf(scope: AuditScope, name: string | null): AuditGroup | undefined {
  return groupsOf(scope).find((group) => group === name);
}

/**
 * The actions a group of the scope filters by, sent as the log's `actions`: at most 30 (the
 * contract's bound), each one the API writes.
 */
export function actionsOf(scope: AuditScope, group: AuditGroup): readonly AuditAction[] {
  if (scope === 'space') return SPACE[group as SpaceGroup];
  return PLATFORM[group as PlatformGroup];
}
