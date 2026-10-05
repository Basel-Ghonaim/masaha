import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession } from '../../../test/fakeSession';
import { fakeTransport, refused, restoreTransport } from '../../../test/fakeTransport';
import { hasSessionHint, setSessionHint, stubCookies } from '../../../test/sessionHint';
import { signOut } from './signOut';
import { establishSession, getSession, onSessionEnded } from '../store';

function signedIn() {
  establishSession(aSession(), { source: 'signIn' });
  setSessionHint(true);
  const ended = vi.fn();
  onTestFinished(onSessionEnded(ended));
  return { ended };
}

const NO_CONTENT: FakeAnswer = { status: 204 };

beforeEach(() => {
  stubCookies();
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('signOut', () => {
  it('ends the session, clears the hint and runs the ended listeners once the server agrees', async () => {
    const { ended } = signedIn();
    const requests = fakeTransport(() => NO_CONTENT);

    await signOut();

    expect(requests.map((request) => request.url)).toEqual(['/auth/logout']);
    expect(getSession().status).toBe('anonymous');
    expect(hasSessionHint()).toBe(false);
    expect(ended).toHaveBeenCalledOnce();
  });

  it('ends the session, runs the other listeners and logs the error when an ended listener throws', async () => {
    signedIn();
    fakeTransport(() => NO_CONTENT);
    const failure = new Error('A listener failed');
    onTestFinished(
      onSessionEnded(() => {
        throw failure;
      }),
    );
    const after = vi.fn();
    onTestFinished(onSessionEnded(after));
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    onTestFinished(() => {
      logged.mockRestore();
    });

    await expect(signOut()).resolves.toBeUndefined();

    expect(getSession().status).toBe('anonymous');
    expect(after).toHaveBeenCalledOnce();
    expect(logged).toHaveBeenCalledExactlyOnceWith(failure);
  });

  it.each([
    ['network', { failure: 'ERR_NETWORK' }],
    ['server', refused(500, { type: 'server' })],
  ] satisfies [string, FakeAnswer][])(
    'keeps the session and the hint, and rejects, on a %s failure',
    async (type, answer) => {
      const { ended } = signedIn();
      fakeTransport(() => answer);

      await expect(signOut()).rejects.toMatchObject({ type });

      expect(getSession().status).toBe('authenticated');
      expect(hasSessionHint()).toBe(true);
      expect(ended).not.toHaveBeenCalled();
    },
  );
});
