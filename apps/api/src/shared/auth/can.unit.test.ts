import { describe, expect, it } from 'vitest';

import {
  ACTIONS,
  can,
  type Actor,
  type SelfAction,
  type SpaceAction,
  type SpaceLink,
  type SpaceResource,
  type UnscopedAction,
} from './can.ts';

// The expected permissions of ADR 0002 and ADR 0009, written out independently of the table in
// can.ts: a mistake in the table fails here instead of being copied.

// Reception staff are global USERs; owners carry the global OWNER label (ADR 0009).
const USER: Actor = { id: 1, role: 'USER' };
const RECEPTION_OF_THIS_SPACE: Actor = { id: 2, role: 'USER' };
const RECEPTION_OF_ANOTHER_SPACE: Actor = { id: 3, role: 'USER' };
const OWNER_OF_ANOTHER_SPACE: Actor = { id: 4, role: 'OWNER' };
const OWNER_OF_THIS_SPACE: Actor = { id: 5, role: 'OWNER' };
const ADMIN: Actor = { id: 6, role: 'ADMIN' };

const link = (userId: number, role: SpaceLink['role'], deactivatedAt: Date | null = null) => ({
  userId,
  role,
  deactivatedAt,
});

const VERIFIED: SpaceResource = {
  links: [
    link(OWNER_OF_THIS_SPACE.id, 'OWNER'),
    link(RECEPTION_OF_THIS_SPACE.id, 'RECEPTION'),
    link(9, 'OWNER'),
  ],
};
// No owner has joined, or the owner was unlinked while a reception link remained: a RECEPTION
// link never verifies a space.
const UNVERIFIED: SpaceResource = { links: [link(RECEPTION_OF_THIS_SPACE.id, 'RECEPTION')] };

interface Cells {
  user: boolean;
  receptionOfThis: boolean;
  receptionOfAnother: boolean;
  ownerOfAnother: boolean;
  /** Absent on an unverified space: no owner of it exists. */
  ownerOfThis?: boolean;
  admin: boolean;
}
type SpaceCells = [unverified: Cells, verified: Cells];

const NOBODY = {
  user: false,
  receptionOfThis: false,
  receptionOfAnother: false,
  ownerOfAnother: false,
  admin: false,
};

const OWNER_ONLY: SpaceCells = [NOBODY, { ...NOBODY, ownerOfThis: true }];
const STAFF: SpaceCells = [
  { ...NOBODY, receptionOfThis: true },
  { ...NOBODY, receptionOfThis: true, ownerOfThis: true },
];
const ADMIN_OR_OWNER: SpaceCells = [
  { ...NOBODY, admin: true },
  { ...NOBODY, ownerOfThis: true, admin: true },
];
const ADMIN_WHILE_UNVERIFIED: SpaceCells = [
  { ...NOBODY, admin: true },
  { ...NOBODY, ownerOfThis: true },
];

const SPACE_EXPECTATIONS: Record<SpaceAction, SpaceCells> = {
  'space.profile.update': ADMIN_WHILE_UNVERIFIED,
  'space.facts.update': ADMIN_WHILE_UNVERIFIED,
  'dataReports.resolve': ADMIN_WHILE_UNVERIFIED,
  'space.dataReports.read': ADMIN_OR_OWNER,
  'attendance.record': STAFF,
  'occupancy.read': STAFF,
  'customers.manage': STAFF,
  'subscriptions.manage': STAFF,
  'payments.record': STAFF,
  'payments.readOwn': STAFF,
  'announcements.manage': STAFF,
  'space.liveStatus.override': STAFF,
  'payments.read': OWNER_ONLY,
  'payments.void': OWNER_ONLY,
  'finance.read': OWNER_ONLY,
  'subscriptions.extendAfterClosure': OWNER_ONLY,
  'packages.manage': OWNER_ONLY,
  'space.capacity.manage': OWNER_ONLY,
  'space.settings.manage': OWNER_ONLY,
  'staff.manage': OWNER_ONLY,
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
  ['the reception of this space', RECEPTION_OF_THIS_SPACE],
  ['the reception of another space', RECEPTION_OF_ANOTHER_SPACE],
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
        ['a reception left linked to it', unverified.receptionOfThis, RECEPTION_OF_THIS_SPACE],
        [
          'the reception of another space',
          unverified.receptionOfAnother,
          RECEPTION_OF_ANOTHER_SPACE,
        ],
        ['an OWNER', unverified.ownerOfAnother, OWNER_OF_ANOTHER_SPACE],
        ['an ADMIN', unverified.admin, ADMIN],
      ])('on an unverified space, for %s: %s', (_who, expected, actor) => {
        expect(can(actor, action, UNVERIFIED)).toBe(expected);
      });

      it.each([
        ['a USER', verified.user, USER],
        ['the reception of this space', verified.receptionOfThis, RECEPTION_OF_THIS_SPACE],
        ['the reception of another space', verified.receptionOfAnother, RECEPTION_OF_ANOTHER_SPACE],
        ['an OWNER of another space', verified.ownerOfAnother, OWNER_OF_ANOTHER_SPACE],
        ['the OWNER of this space', verified.ownerOfThis, OWNER_OF_THIS_SPACE],
        ['an ADMIN', verified.admin, ADMIN],
      ])('on a verified space, for %s: %s', (_who, expected, actor) => {
        expect(can(actor, action, VERIFIED)).toBe(expected);
      });

      it('grants nothing through a deactivated link', () => {
        const deactivated: SpaceResource = {
          links: [
            link(OWNER_OF_THIS_SPACE.id, 'OWNER', new Date('2026-09-29T10:00:00Z')),
            link(RECEPTION_OF_THIS_SPACE.id, 'RECEPTION', new Date('2026-09-29T10:00:00Z')),
            link(9, 'OWNER'),
          ],
        };

        expect(can(OWNER_OF_THIS_SPACE, action, deactivated)).toBe(false);
        expect(can(RECEPTION_OF_THIS_SPACE, action, deactivated)).toBe(false);
      });

      it("follows the link's role, never the global role", () => {
        // Labels out of sync with the links: a global USER holding an OWNER link, and a global
        // OWNER (of another space) working as reception here.
        const space: SpaceResource = {
          links: [link(USER.id, 'OWNER'), link(OWNER_OF_ANOTHER_SPACE.id, 'RECEPTION')],
        };

        expect(can(USER, action, space)).toBe(verified.ownerOfThis);
        expect(can(OWNER_OF_ANOTHER_SPACE, action, space)).toBe(verified.receptionOfThis);
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
