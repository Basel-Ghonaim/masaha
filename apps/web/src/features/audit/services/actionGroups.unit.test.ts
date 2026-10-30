import { AUDIT_ACTIONS, AUDIT_ACTIONS_MAX } from '@masaha/shared/audit';
import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { actionsOf, groupOf, groupsOf } from './actionGroups';

describe('the action groups', () => {
  it.each(['space', 'platform'] as const)(
    'each %s group holds at most 30 actions, each known, and is named in both languages',
    (scope) => {
      for (const group of groupsOf(scope)) {
        const actions = actionsOf(scope, group);
        expect(actions.length).toBeGreaterThan(0);
        expect(actions.length).toBeLessThanOrEqual(AUDIT_ACTIONS_MAX);
        expect(
          actions.every((action) => (AUDIT_ACTIONS as readonly string[]).includes(action)),
        ).toBe(true);
        expect(new Set(actions).size).toBe(actions.length);
        expect(CATALOGUES.ar.audit.groups[group]).toBeTruthy();
        expect(CATALOGUES.en.audit.groups[group]).toBeTruthy();
      }
    },
  );

  it("puts each of the owner's actions a space writes in one group", () => {
    const grouped = groupsOf('space').flatMap((group) => actionsOf('space', group));
    expect(new Set(grouped).size).toBe(grouped.length);
    // The platform's own actions are never a space's.
    expect(
      AUDIT_ACTIONS.filter(
        (action) =>
          !grouped.includes(action) &&
          !/^(governorate|area|amenity|platformSettings)\./.test(action),
      ),
    ).toEqual([
      'user.profileEdited',
      'user.replaced',
      'user.roleChanged',
      'user.suspended',
      'user.unsuspended',
    ]);
  });

  it('groups the admin’s accounts without the profile edits, the owners apart from the spaces', () => {
    expect(actionsOf('platform', 'accounts')).not.toContain('user.profileEdited');
    expect(actionsOf('platform', 'accounts')).toContain('user.suspended');
    expect(actionsOf('platform', 'owners')).toEqual(['space.ownerLinked', 'space.ownerUnlinked']);
    expect(actionsOf('platform', 'spaces')).not.toContain('space.ownerLinked');
    expect(actionsOf('space', 'space')).toContain('space.ownerLinked');
    expect(actionsOf('space', 'subscriptions')).toContain('closure.subscriptionsExtended');
  });

  it("reads a group from the address only among the scope's", () => {
    expect(groupOf('space', 'payments')).toBe('payments');
    expect(groupOf('platform', 'payments')).toBeUndefined();
    expect(groupOf('platform', 'lookups')).toBe('lookups');
    expect(groupOf('space', null)).toBeUndefined();
  });
});
