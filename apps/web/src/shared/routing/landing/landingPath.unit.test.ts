import type { SessionUser } from '@shared/session';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aSession } from '../../../test/fakeSession';
import { stubLocalStorage } from '../../../test/fakeStorage';
import { landingPath } from './landingPath';
import { rememberSpace } from './lastSpace';

function aUser(user: Partial<SessionUser>): SessionUser {
  return aSession({ id: 1, ...user }).user;
}

const owner = aUser({
  role: 'OWNER',
  spaces: [
    { spaceId: 3, role: 'OWNER' },
    { spaceId: 7, role: 'RECEPTION' },
  ],
});

let stored: Map<string, string>;

beforeEach(() => {
  stored = stubLocalStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('landingPath', () => {
  it('lands on the safe return URL in `next`, whoever the user is', () => {
    const search = '?next=%2Fme%2Ffavorites%3Ftab%3D2';

    expect(landingPath(owner, search)).toBe('/me/favorites?tab=2');
    expect(landingPath(aUser({ role: 'ADMIN' }), search)).toBe('/me/favorites?tab=2');
  });

  it('lands on an explicit `next=/`, over the landing the role would give', () => {
    rememberSpace(1, 7);

    expect(landingPath(owner, '?next=%2F')).toBe('/');
    expect(landingPath(aUser({ role: 'ADMIN' }), '?next=%2F')).toBe('/');
  });

  it('ignores a `next` that would leave the site, and lands by the user’s role', () => {
    expect(landingPath(owner, '?next=%2F%2Fevil.example')).toBe('/dashboard/spaces/3');
    expect(landingPath(owner, '?next=https%3A%2F%2Fevil.example')).toBe('/dashboard/spaces/3');
  });

  it('lands an ADMIN on the admin’s overview, even with space links', () => {
    const admin = aUser({ role: 'ADMIN', spaces: [{ spaceId: 3, role: 'OWNER' }] });

    expect(landingPath(admin, '')).toBe('/dashboard/admin');
  });

  it('lands an OWNER at their space on its overview', () => {
    const user = aUser({ role: 'OWNER', spaces: [{ spaceId: 3, role: 'OWNER' }] });

    expect(landingPath(user, '')).toBe('/dashboard/spaces/3');
  });

  it('lands RECEPTION at their space on its front desk', () => {
    const user = aUser({ spaces: [{ spaceId: 7, role: 'RECEPTION' }] });

    expect(landingPath(user, '')).toBe('/dashboard/spaces/7/desk');
  });

  it('lands on the last space used, by the role there, over the oldest link', () => {
    rememberSpace(1, 7);

    expect(landingPath(owner, '')).toBe('/dashboard/spaces/7/desk');
  });

  it('lands on the oldest link when no space is remembered', () => {
    expect(landingPath(owner, '')).toBe('/dashboard/spaces/3');
  });

  it('falls back to the oldest link when the remembered space’s link is gone', () => {
    rememberSpace(1, 9);

    expect(landingPath(owner, '')).toBe('/dashboard/spaces/3');
  });

  it.each([
    ['garbage', 'abc'],
    ['a padded id', '07'],
    ['an id with a space', ' 7'],
  ])('falls back to the oldest link when the remembered value is %s', (_, value) => {
    stored.set('masaha.lastSpace.1', value);

    expect(landingPath(owner, '')).toBe('/dashboard/spaces/3');
  });

  it('falls back to the oldest link when only another user’s space is remembered', () => {
    rememberSpace(2, 7);

    expect(landingPath(owner, '')).toBe('/dashboard/spaces/3');
  });

  it('lands a user with no role and no links at home', () => {
    expect(landingPath(aUser({ role: 'USER', spaces: [] }), '')).toBe('/');
  });
});
