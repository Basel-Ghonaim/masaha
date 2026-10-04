import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession, deferred } from '../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { hasSessionHint, setSessionHint, stubCookies } from '../../../test/sessionHint';
import { refreshSession } from './refresh';
import { restoreSession } from './restore';
import { signOut } from './signOut';
import { establishSession, getSession, onSessionEnded } from '../store';

/** A signed-in page, with its hint, and a listener that counts the session's end. */
function signedIn() {
  establishSession(aSession({}, 'token-old'), { source: 'signIn' });
  setSessionHint(true);
  const ended = vi.fn();
  onTestFinished(onSessionEnded(ended));
  return { ended };
}

/** The refreshes among the requests the fake server received. */
function refreshes(requests: ReturnType<typeof fakeTransport>) {
  return requests.filter((request) => request.url === '/auth/refresh');
}

beforeEach(() => {
  stubCookies();
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('refreshSession', () => {
  it('makes one request when the restore and the transport refresh together', async () => {
    setSessionHint(true);
    const answer = deferred<FakeAnswer>();
    const requests = fakeTransport(() => answer.promise);

    const restoring = restoreSession();
    const transport = refreshSession();
    answer.resolve(ok(aSession({}, 'token-new')));
    await Promise.all([restoring, transport]);

    expect(refreshes(requests)).toHaveLength(1);
    expect(getSession().accessToken).toBe('token-new');
  });

  it('has the new token in the store by the time its promise resolves', async () => {
    signedIn();
    fakeTransport(() => ok(aSession({}, 'token-new')));

    const tokenOnResolve = await refreshSession().then(() => getSession().accessToken);

    expect(tokenOnResolve).toBe('token-new');
  });

  it.each([
    ['unauthorized', 401, undefined],
    ['forbidden', 403, 'ACCOUNT_SUSPENDED'],
  ] as const)(
    'ends the session, clears the hint and rejects when the refresh answers %s %d %s',
    async (type, status, code) => {
      const { ended } = signedIn();
      fakeTransport(() => refused(status, { type, ...(code ? { code } : {}) }));

      await expect(refreshSession()).rejects.toMatchObject({ status });

      expect(getSession().status).toBe('anonymous');
      expect(hasSessionHint()).toBe(false);
      expect(ended).toHaveBeenCalledOnce();
    },
  );

  it('keeps the session and rejects on a 403 with no code, a refusal of the request only', async () => {
    const { ended } = signedIn();
    const before = getSession();
    fakeTransport(() => refused(403, { type: 'forbidden' }));

    await expect(refreshSession()).rejects.toMatchObject({ status: 403 });

    expect(getSession()).toEqual(before);
    expect(hasSessionHint()).toBe(true);
    expect(ended).not.toHaveBeenCalled();
  });

  it('drops a refresh that succeeds after a sign-out was answered first', async () => {
    signedIn();
    const refreshAnswer = deferred<FakeAnswer>();
    fakeTransport((request) =>
      request.url === '/auth/refresh' ? refreshAnswer.promise : { status: 204 },
    );

    const refreshing = refreshSession();
    await signOut();
    refreshAnswer.resolve(ok(aSession({}, 'token-late')));

    await expect(refreshing).rejects.toMatchObject({ type: 'canceled' });
    expect(getSession()).toEqual({ status: 'anonymous', user: null, accessToken: null });
  });

  it('keeps the session and rejects when the refresh cannot reach the server', async () => {
    const { ended } = signedIn();
    const before = getSession();
    fakeTransport(() => ({ failure: 'ERR_NETWORK' }));

    await expect(refreshSession()).rejects.toMatchObject({ type: 'network' });

    expect(getSession()).toEqual(before);
    expect(getSession().status).toBe('authenticated');
    expect(hasSessionHint()).toBe(true);
    expect(ended).not.toHaveBeenCalled();
  });

  it('starts a new request once the previous one has settled', async () => {
    signedIn();
    const requests = fakeTransport(() => ok(aSession()));

    await refreshSession();
    await refreshSession();

    expect(refreshes(requests)).toHaveLength(2);
  });
});
