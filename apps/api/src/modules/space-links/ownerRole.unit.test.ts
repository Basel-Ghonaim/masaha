import { describe, expect, it } from 'vitest';

import { ownerRoleFor } from './ownerRole.ts';

describe('ownerRoleFor', () => {
  it.each([
    ['a user’s first owner link makes them an owner', 'USER', 1, 'OWNER'],
    ['an owner’s last link ended makes them a user again', 'OWNER', 0, 'USER'],
    ['an owner with links left stays one', 'OWNER', 2, null],
    ['a user with no owner link stays one', 'USER', 0, null],
    ['an admin is never changed, with links', 'ADMIN', 1, null],
    ['an admin is never changed, without', 'ADMIN', 0, null],
  ] as const)('%s', (_case, role, links, expected) => {
    expect(ownerRoleFor(role, links)).toBe(expected);
  });
});
