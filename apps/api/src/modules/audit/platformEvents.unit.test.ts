import { AUDIT_ACTIONS } from '@masaha/shared/audit';
import { describe, expect, it } from 'vitest';

import { isPlatformEvent, PLATFORM_ACCOUNT_ACTIONS, PLATFORM_ACTIONS } from './platformEvents.ts';

// The admin's allowlist (docs/backend/conventions.md §6): default deny, ADR 0002 and 0009's privacy.

/** A space's operations, money, people and staff: never the admin's. */
const THE_SPACES_OWN = ['customer.', 'subscription.', 'checkIn.', 'visit.', 'payment.', 'package.'];
const THE_SPACES_OWN_TOO = ['announcement.', 'closure.'];
const SPACE_PRIVATE = [
  'space.capacityEdited',
  'space.statusOverridden',
  'space.statusOverrideCleared',
  'space.settingsEdited',
  'space.staffAdded',
  'space.staffDeactivated',
  'space.staffReactivated',
];

describe("the admin's allowlist", () => {
  it("the platform's list names no customer, subscription, check-in, visit, payment, package, announcement or closure action, nor a space's capacity, override, settings or staff; an account's event is the platform's only with no space", () => {
    const listed = [...PLATFORM_ACTIONS, ...PLATFORM_ACCOUNT_ACTIONS];
    for (const action of listed) {
      expect(AUDIT_ACTIONS).toContain(action);
      for (const prefix of [...THE_SPACES_OWN, ...THE_SPACES_OWN_TOO]) {
        expect(action.startsWith(prefix), action).toBe(false);
      }
      expect(SPACE_PRIVATE).not.toContain(action);
    }
    for (const action of AUDIT_ACTIONS) {
      const spaces = [null, 3];
      const answers = spaces.map((spaceId) => isPlatformEvent({ action, spaceId }));
      if ([...THE_SPACES_OWN, ...THE_SPACES_OWN_TOO].some((prefix) => action.startsWith(prefix))) {
        expect(answers, action).toEqual([false, false]);
      }
    }

    // The platform's events, whatever space they name.
    for (const action of ['space.hidden', 'space.ownerLinked', 'space.profileEdited']) {
      expect(isPlatformEvent({ action, spaceId: 3 })).toBe(true);
      expect(isPlatformEvent({ action, spaceId: null })).toBe(true);
    }
    expect(isPlatformEvent({ action: 'dataReport.resolved', spaceId: 3 })).toBe(true);
    expect(isPlatformEvent({ action: 'area.edited', spaceId: null })).toBe(true);
    // An account's: the platform's with no space; an owner's staff account's is the space's.
    for (const action of ['user.created', 'user.temporaryPasswordIssued', 'user.suspended']) {
      expect(isPlatformEvent({ action, spaceId: null })).toBe(true);
      expect(isPlatformEvent({ action, spaceId: 3 })).toBe(false);
    }
    // Default deny: a space's own, a person's own name or language, and an action on no list.
    for (const action of [
      ...SPACE_PRIVATE,
      'payment.recorded',
      'user.profileEdited',
      'space.somethingNew',
    ]) {
      expect(isPlatformEvent({ action, spaceId: null })).toBe(false);
      expect(isPlatformEvent({ action, spaceId: 3 })).toBe(false);
    }
  });

  it("the platform's settings are the platform's", () => {
    for (const action of [
      'platformSettings.newSpaceDefaultsEdited',
      'platformSettings.stalenessEdited',
      'platformSettings.contactEdited',
    ]) {
      expect(AUDIT_ACTIONS).toContain(action);
      expect(isPlatformEvent({ action, spaceId: null }), action).toBe(true);
    }
  });
});
