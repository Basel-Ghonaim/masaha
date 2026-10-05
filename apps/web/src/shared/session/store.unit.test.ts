import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { aSession } from '../../test/fakeSession';
import {
  endSession,
  establishSession,
  getSession,
  onSessionEstablished,
  passwordChanged,
} from './store';

describe('establishSession', () => {
  it.each(['signIn', 'restore'] as const)(
    'holds the session and tells the listeners it came from %s',
    (source) => {
      const listener = vi.fn();
      onTestFinished(onSessionEstablished(listener));
      const session = aSession({ language: 'en' }, 'token-new');

      establishSession(session, { source });

      expect(getSession()).toEqual({
        status: 'authenticated',
        user: session.user,
        accessToken: 'token-new',
      });
      expect(listener).toHaveBeenCalledExactlyOnceWith(session, { source });
    },
  );

  it('stops telling a listener once it is removed', () => {
    const listener = vi.fn();
    const stop = onSessionEstablished(listener);

    stop();
    establishSession(aSession(), { source: 'signIn' });

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('passwordChanged', () => {
  it('renews the access token and clears the pending change, telling no listener', () => {
    const session = aSession({ mustChangePassword: true }, 'token-temporary');
    establishSession(session, { source: 'signIn' });
    const listener = vi.fn();
    onTestFinished(onSessionEstablished(listener));

    passwordChanged(session.user.id, 'token-renewed');

    expect(getSession()).toEqual({
      status: 'authenticated',
      user: { ...session.user, mustChangePassword: false },
      accessToken: 'token-renewed',
    });
    expect(listener).not.toHaveBeenCalled();
  });

  it('leaves a session that has ended signed out', () => {
    establishSession(aSession({ id: 1, mustChangePassword: true }), { source: 'signIn' });
    endSession();

    passwordChanged(1, 'token-renewed');

    expect(getSession()).toEqual({ status: 'anonymous', user: null, accessToken: null });
  });

  it('leaves the session of another user who signed in meanwhile untouched', () => {
    establishSession(aSession({ id: 1, mustChangePassword: true }), { source: 'signIn' });
    endSession();
    const other = aSession({ id: 2, mustChangePassword: true }, 'token-other');
    establishSession(other, { source: 'signIn' });

    passwordChanged(1, 'token-renewed');

    expect(getSession()).toEqual({
      status: 'authenticated',
      user: other.user,
      accessToken: 'token-other',
    });
  });
});
