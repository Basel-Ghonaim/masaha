import type { Role, SpaceManagerRole } from '../../generated/prisma/enums.ts';

// The permission table of ADR 0002 and ADR 0009: every protected action and the one rule that
// decides it. Services call can() for actions on a resource; the one other role check is
// requireRole, which guards the /admin prefix by the global role.

/** Who is acting: the signed-in user, from the access token. */
export interface Actor {
  readonly id: number;
  readonly role: Role;
}

/** One SpaceManager row: a user's link to the space, as its OWNER or RECEPTION. */
export interface SpaceLink {
  readonly userId: number;
  readonly role: SpaceManagerRole;
  /** A deactivated link grants nothing. */
  readonly deactivatedAt: Date | null;
}

/**
 * The space an action targets. `links` are its SpaceManager rows, loaded by the service from the
 * database, never taken from the client. A space without an active OWNER link is unverified.
 */
export interface SpaceResource {
  readonly links: readonly SpaceLink[];
}

/** A resource that belongs to one user: their profile, favourites or data reports. */
export interface OwnedResource {
  readonly userId: number;
}

type Rule =
  /** ADMIN only, on any space. */
  | 'admin'
  /** The space's OWNER. */
  | 'owner'
  /** The space's staff: its OWNER or its RECEPTION. */
  | 'staff'
  /** ADMIN, or the space's OWNER. */
  | 'adminOrOwner'
  /** ADMIN while the space is unverified; once verified, only its OWNER, and no longer ADMIN. */
  | 'adminWhileUnverifiedElseOwner'
  /** Any role, on their own resource only. */
  | 'self'
  /** Any signed-in user. */
  | 'signedIn';

const PERMISSIONS = {
  // The space's public facts: who keeps them depends on whether an owner has joined.
  'space.profile.update': 'adminWhileUnverifiedElseOwner',
  'space.facts.update': 'adminWhileUnverifiedElseOwner',
  'dataReports.resolve': 'adminWhileUnverifiedElseOwner',
  'space.dataReports.read': 'adminOrOwner',

  // The front desk, for the owner and reception (ADR 0009). Customers, attendance, payments and
  // capacity are private from the admin (ADR 0002, ADR 0008).
  'attendance.record': 'staff',
  'occupancy.read': 'staff',
  'customers.manage': 'staff',
  'subscriptions.manage': 'staff',
  'payments.record': 'staff',
  /** The payments the actor recorded today (shift handover). */
  'payments.readOwn': 'staff',
  'announcements.manage': 'staff',
  'space.liveStatus.override': 'staff',

  // The owner's own: money, the space's setup and its staff.
  'payments.read': 'owner',
  'payments.void': 'owner',
  'finance.read': 'owner',
  'subscriptions.extendAfterClosure': 'owner',
  'packages.manage': 'owner',
  'space.capacity.manage': 'owner',
  'space.settings.manage': 'owner',
  'staff.manage': 'owner',
  'space.auditLog.read': 'owner',

  // The platform. Hiding, soft-deleting and linking apply to every space, verified or not.
  'platform.spaces.manage': 'admin',
  'platform.managers.manage': 'admin',
  'platform.stats.read': 'admin',
  'platform.users.manage': 'admin',
  'platform.dataReports.read': 'admin',
  'platform.lookups.manage': 'admin',
  'platform.auditLog.read': 'admin',
  'platform.settings.manage': 'admin',

  // The user's own things.
  'profile.update': 'self',
  'favorites.manage': 'self',
  'dataReports.readOwn': 'self',
  'dataReports.create': 'signedIn',
} as const satisfies Record<string, Rule>;

export type Action = keyof typeof PERMISSIONS;

type ActionWith<R extends Rule> = {
  [A in Action]: (typeof PERMISSIONS)[A] extends R ? A : never;
}[Action];

/** Actions on one space; they take its `SpaceResource`. */
export type SpaceAction = ActionWith<
  'owner' | 'staff' | 'adminOrOwner' | 'adminWhileUnverifiedElseOwner'
>;
/** Actions on a user's own resource; they take an `OwnedResource`. */
export type SelfAction = ActionWith<'self'>;
/** Actions decided by the role alone; they take no resource. */
export type UnscopedAction = ActionWith<'admin' | 'signedIn'>;

export const ACTIONS = Object.keys(PERMISSIONS) as readonly Action[];

/** What each rule needs to decide, so a call without the right resource does not compile. */
interface RuleResources {
  admin: [];
  signedIn: [];
  self: [resource: OwnedResource];
  owner: [resource: SpaceResource];
  staff: [resource: SpaceResource];
  adminOrOwner: [resource: SpaceResource];
  adminWhileUnverifiedElseOwner: [resource: SpaceResource];
}

/** Whether `actor` may perform `action` on `resource`. Pure: the caller loads the resource. */
export function can<A extends Action>(
  actor: Actor,
  action: A,
  ...args: RuleResources[(typeof PERMISSIONS)[A]]
): boolean {
  const rule: Rule = PERMISSIONS[action];
  // The signature guarantees each rule the resource it reads.
  const resource = (args as readonly (OwnedResource | SpaceResource)[])[0];

  switch (rule) {
    case 'admin':
      return isAdmin(actor);
    case 'signedIn':
      return true;
    case 'self':
      return actor.id === (resource as OwnedResource).userId;
    case 'owner':
      return roleAt(actor, resource as SpaceResource) === 'OWNER';
    case 'staff':
      return roleAt(actor, resource as SpaceResource) !== undefined;
    case 'adminOrOwner':
      return isAdmin(actor) || roleAt(actor, resource as SpaceResource) === 'OWNER';
    case 'adminWhileUnverifiedElseOwner': {
      const space = resource as SpaceResource;
      return isVerified(space) ? roleAt(actor, space) === 'OWNER' : isAdmin(actor);
    }
  }
}

function isAdmin(actor: Actor): boolean {
  return actor.role === 'ADMIN';
}

// The actor's role at the space comes only from their active link, never from the global role
// (ADR 0009): the global OWNER is a label, and reception staff are global USERs.
function roleAt(actor: Actor, space: SpaceResource): SpaceManagerRole | undefined {
  return space.links.find((link) => link.userId === actor.id && link.deactivatedAt === null)?.role;
}

// A RECEPTION link never verifies a space (ADR 0009).
function isVerified(space: SpaceResource): boolean {
  return space.links.some((link) => link.role === 'OWNER' && link.deactivatedAt === null);
}
