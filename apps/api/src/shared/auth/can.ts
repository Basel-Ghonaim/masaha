import type { Role } from '../../generated/prisma/enums.ts';

// The permission table of ADR 0002: every protected action and the one rule that decides it.
// Services call can(); no role check lives anywhere else.

/** Who is acting: the signed-in user, from the access token. */
export interface Actor {
  readonly id: number;
  readonly role: Role;
}

/**
 * The space an action targets. `managerIds` are the users of its SpaceManager rows, loaded by the
 * service from the database, never taken from the client. A space with none is unverified.
 */
export interface SpaceResource {
  readonly managerIds: readonly number[];
}

/** A resource that belongs to one user: their profile, favourites or data reports. */
export interface OwnedResource {
  readonly userId: number;
}

type Rule =
  /** ADMIN only, on any space. */
  | 'admin'
  /** The OWNER linked to the space. */
  | 'manager'
  /** ADMIN, or the OWNER linked to the space. */
  | 'adminOrManager'
  /** ADMIN while the space is unverified; once verified, only its OWNER, and no longer ADMIN. */
  | 'adminWhileUnverifiedElseManager'
  /** Any role, on their own resource only. */
  | 'self'
  /** Any signed-in user. */
  | 'signedIn';

const PERMISSIONS = {
  // The space's public facts: who keeps them depends on whether an owner has joined.
  'space.profile.update': 'adminWhileUnverifiedElseManager',
  'space.facts.update': 'adminWhileUnverifiedElseManager',
  'dataReports.resolve': 'adminWhileUnverifiedElseManager',
  'space.dataReports.read': 'adminOrManager',

  // The space's operations. Members and attendance are private from the admin (ADR 0002), and so
  // is capacity (ADR 0008).
  'space.capacity.manage': 'manager',
  'space.settings.manage': 'manager',
  'members.manage': 'manager',
  'attendance.record': 'manager',
  'occupancy.read': 'manager',
  'announcements.manage': 'manager',
  'space.auditLog.read': 'manager',

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
  'manager' | 'adminOrManager' | 'adminWhileUnverifiedElseManager'
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
  manager: [resource: SpaceResource];
  adminOrManager: [resource: SpaceResource];
  adminWhileUnverifiedElseManager: [resource: SpaceResource];
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
    case 'manager':
      return isManager(actor, resource as SpaceResource);
    case 'adminOrManager':
      return isAdmin(actor) || isManager(actor, resource as SpaceResource);
    case 'adminWhileUnverifiedElseManager': {
      const space = resource as SpaceResource;
      return space.managerIds.length === 0 ? isAdmin(actor) : isManager(actor, space);
    }
  }
}

function isAdmin(actor: Actor): boolean {
  return actor.role === 'ADMIN';
}

// The role is checked too: a demoted owner loses access even before the link is removed.
function isManager(actor: Actor, space: SpaceResource): boolean {
  return actor.role === 'OWNER' && space.managerIds.includes(actor.id);
}
