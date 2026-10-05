import { describe, expect, it } from 'vitest';
import { aSession } from '../../../test/fakeSession';
import { hasDashboard } from './hasDashboard';

describe('hasDashboard', () => {
  it.each([
    ['the admin', { role: 'ADMIN' as const }],
    [
      'an owner of a space',
      { role: 'OWNER' as const, spaces: [{ spaceId: 3, role: 'OWNER' as const }] },
    ],
    ['the reception of a space', { spaces: [{ spaceId: 7, role: 'RECEPTION' as const }] }],
  ])('gives %s a dashboard', (_, fields) => {
    expect(hasDashboard(aSession(fields).user)).toBe(true);
  });

  it.each([
    ['a user with no role and no space', {}],
    ['an owner left with no active link', { role: 'OWNER' as const }],
  ])('gives %s none', (_, fields) => {
    expect(hasDashboard(aSession(fields).user)).toBe(false);
  });
});
