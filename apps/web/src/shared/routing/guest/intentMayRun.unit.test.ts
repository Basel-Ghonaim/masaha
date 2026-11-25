import type { SessionState } from '@shared/session';
import { describe, expect, it } from 'vitest';
import { aSession } from '../../../test/fakeSession';
import { intentMayRun } from './intentMayRun';

function signedIn(mustChangePassword: boolean): SessionState {
  const { user, accessToken } = aSession({ mustChangePassword });
  return { status: 'authenticated', user, accessToken };
}

describe('intentMayRun', () => {
  it.each([
    ['while the session is restored', { status: 'restoring', user: null, accessToken: null }],
    ['for a guest', { status: 'anonymous', user: null, accessToken: null }],
    [
      'while the server is unreachable',
      { status: 'unreachable', reason: 'offline', user: null, accessToken: null },
    ],
    ['while a temporary password is still to change', signedIn(true)],
  ] as [string, SessionState][])('lets no held action run %s', (_case, session) => {
    expect(intentMayRun(session)).toBe(false);
  });

  it('lets it run for a signed-in user with no change pending', () => {
    expect(intentMayRun(signedIn(false))).toBe(true);
  });
});
