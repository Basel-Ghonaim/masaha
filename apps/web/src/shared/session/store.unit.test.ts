import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { aSession } from '../../test/fakeSession';
import { establishSession, getSession, onSessionEstablished } from './store';

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
