import { describe, expect, it } from 'vitest';

import {
  ACTIONS,
  can,
  type Actor,
  type SelfAction,
  type SpaceAction,
  type SpaceResource,
  type UnscopedAction,
} from './can.ts';

// The expected permissions of ADR 0002, written out independently of the table in can.ts: a
// mistake in the table fails here instead of being copied.

const USER: Actor = { id: 1, role: 'USER' };
const OWNER_OF_ANOTHER_SPACE: Actor = { id: 2, role: 'OWNER' };
const OWNER_OF_THIS_SPACE: Actor = { id: 3, role: 'OWNER' };
const ADMIN: Actor = { id: 4, role: 'ADMIN' };

const UNVERIFIED: SpaceResource = { managerIds: [] };
const VERIFIED: SpaceResource = { managerIds: [OWNER_OF_THIS_SPACE.id, 9] };

// On an unverified space no owner of it exists, so every owner is an owner of another space.
type SpaceCells = [
  unverified: { user: boolean; otherOwner: boolean; admin: boolean },
  verified: { user: boolean; otherOwner: boolean; thisOwner: boolean; admin: boolean },
];

const OWNER_ONLY: SpaceCells = [
  { user: false, otherOwner: false, admin: false },
  { user: false, otherOwner: false, thisOwner: true, admin: false },
];
const ADMIN_WHILE_UNVERIFIED: SpaceCells = [
  { user: false, otherOwner: false, admin: true },
  { user: false, otherOwner: false, thisOwner: true, admin: false },
];
const ADMIN_OR_OWNER: SpaceCells = [
  { user: false, otherOwner: false, admin: true },
  { user: false, otherOwner: false, thisOwner: true, admin: true },
];

const SPACE_EXPECTATIONS: Record<SpaceAction, SpaceCells> = {
  'space.profile.update': ADMIN_WHILE_UNVERIFIED,
  'space.facts.update': ADMIN_WHILE_UNVERIFIED,
  'dataReports.resolve': ADMIN_WHILE_UNVERIFIED,
  'space.dataReports.read': ADMIN_OR_OWNER,
  'space.capacity.manage': OWNER_ONLY,
  'space.settings.manage': OWNER_ONLY,
  'members.manage': OWNER_ONLY,
  'attendance.record': OWNER_ONLY,
  'occupancy.read': OWNER_ONLY,
  'announcements.manage': OWNER_ONLY,
  'space.auditLog.read': OWNER_ONLY,
};

const UNSCOPED_EXPECTATIONS: Record<UnscopedAction, 'adminOnly' | 'everyone'> = {
  'platform.spaces.manage': 'adminOnly',
  'platform.managers.manage': 'adminOnly',
  'platform.stats.read': 'adminOnly',
  'platform.users.manage': 'adminOnly',
  'platform.dataReports.read': 'adminOnly',
  'platform.lookups.manage': 'adminOnly',
  'platform.auditLog.read': 'adminOnly',
  'platform.settings.manage': 'adminOnly',
  'dataReports.create': 'everyone',
};

const SELF_ACTIONS: readonly SelfAction[] = [
  'profile.update',
  'favorites.manage',
  'dataReports.readOwn',
];

const ALL_ACTORS = [
  ['a USER', USER],
  ['an OWNER of another space', OWNER_OF_ANOTHER_SPACE],
  ['the OWNER of this space', OWNER_OF_THIS_SPACE],
  ['an ADMIN', ADMIN],
] as const;

describe('can', () => {
  describe.each(Object.entries(SPACE_EXPECTATIONS) as [SpaceAction, SpaceCells][])(
    '%s',
    (action, [unverified, verified]) => {
      it.each([
        ['a USER', unverified.user, USER],
        ['an OWNER', unverified.otherOwner, OWNER_OF_ANOTHER_SPACE],
        ['an ADMIN', unverified.admin, ADMIN],
      ])('on an unverified space, for %s: %s', (_who, expected, actor) => {
        expect(can(actor, action, UNVERIFIED)).toBe(expected);
      });

      it.each([
        ['a USER', verified.user, USER],
        ['an OWNER of another space', verified.otherOwner, OWNER_OF_ANOTHER_SPACE],
        ['the OWNER of this space', verified.thisOwner, OWNER_OF_THIS_SPACE],
        ['an ADMIN', verified.admin, ADMIN],
      ])('on a verified space, for %s: %s', (_who, expected, actor) => {
        expect(can(actor, action, VERIFIED)).toBe(expected);
      });

      it('refuses a linked user whose role is no longer OWNER', () => {
        const demoted: Actor = { id: OWNER_OF_THIS_SPACE.id, role: 'USER' };

        expect(can(demoted, action, VERIFIED)).toBe(false);
      });
    },
  );

  describe.each(
    Object.entries(UNSCOPED_EXPECTATIONS) as [UnscopedAction, 'adminOnly' | 'everyone'][],
  )('%s', (action, allowed) => {
    it.each(ALL_ACTORS)('for %s', (_who, actor) => {
      expect(can(actor, action)).toBe(allowed === 'everyone' || actor.role === 'ADMIN');
    });
  });

  describe.each(SELF_ACTIONS)('%s', (action) => {
    it.each(ALL_ACTORS)('for %s: allowed on their own resource only', (_who, actor) => {
      expect(can(actor, action, { userId: actor.id })).toBe(true);
      expect(can(actor, action, { userId: 99 })).toBe(false);
    });
  });

  it('has an expectation for every action in the table', () => {
    const expected = [
      ...Object.keys(SPACE_EXPECTATIONS),
      ...Object.keys(UNSCOPED_EXPECTATIONS),
      ...SELF_ACTIONS,
    ];

    expect([...expected].sort()).toEqual([...ACTIONS].sort());
  });
});
