import { onTestFinished, describe, expect, it, vi } from 'vitest';
import { aSession, appError, deferred, fakeEndpoints, fakeHint } from '../../../test/fakeSession';
import type { Session } from '../model';
import { refreshSession } from './refresh';
import { restoreSession } from './restore';
import { signOut } from './signOut';
import { establishSession, getSession, onSessionEnded } from '../store';

/** A signed-in page, with a listener that counts the session's end. */
function signedIn() {
  establishSession(aSession({}, 'token-old'), { source: 'signIn' });
  const ended = vi.fn();
  onTestFinished(onSessionEnded(ended));
  return { ended };
}

describe('refreshSession', () => {
  it('makes one request when the restore and the transport refresh together', async () => {
    const answer = deferred<Session>();
    const endpoints = fakeEndpoints({ refresh: () => answer.promise });
    const dependencies = { endpoints, hint: fakeHint(true) };

    const restoring = restoreSession(dependencies);
    const transport = refreshSession(dependencies);
    answer.resolve(aSession({}, 'token-new'));
    await Promise.all([restoring, transport]);

    expect(endpoints.refresh).toHaveBeenCalledOnce();
    expect(getSession().accessToken).toBe('token-new');
  });

  it('has the new token in the store by the time its promise resolves', async () => {
    signedIn();
    const endpoints = fakeEndpoints({ refresh: () => Promise.resolve(aSession({}, 'token-new')) });

    const tokenOnResolve = await refreshSession({ endpoints, hint: fakeHint(true) }).then(
      () => getSession().accessToken,
    );

    expect(tokenOnResolve).toBe('token-new');
  });

  it.each([
    ['unauthorized', 401, undefined],
    ['forbidden', 403, 'ACCOUNT_SUSPENDED'],
  ] as const)(
    'ends the session, clears the hint and rejects when the refresh answers %s %d %s',
    async (type, status, code) => {
      const { ended } = signedIn();
      const hint = fakeHint(true);
      const endpoints = fakeEndpoints({
        refresh: () => Promise.reject(appError(type, status, code)),
      });

      await expect(refreshSession({ endpoints, hint })).rejects.toMatchObject({ status });

      expect(getSession().status).toBe('anonymous');
      expect(hint.clear).toHaveBeenCalledOnce();
      expect(ended).toHaveBeenCalledOnce();
    },
  );

  it('keeps the session and rejects on a 403 with no code, a refusal of the request only', async () => {
    const { ended } = signedIn();
    const before = getSession();
    const hint = fakeHint(true);
    const endpoints = fakeEndpoints({ refresh: () => Promise.reject(appError('forbidden', 403)) });

    await expect(refreshSession({ endpoints, hint })).rejects.toMatchObject({ status: 403 });

    expect(getSession()).toEqual(before);
    expect(hint.clear).not.toHaveBeenCalled();
    expect(ended).not.toHaveBeenCalled();
  });

  it('drops a refresh that succeeds after a sign-out was answered first', async () => {
    signedIn();
    const answer = deferred<Session>();
    const hint = fakeHint(true);
    const endpoints = fakeEndpoints({ refresh: () => answer.promise });

    const refreshing = refreshSession({ endpoints, hint });
    await signOut({ endpoints, hint });
    answer.resolve(aSession({}, 'token-late'));

    await expect(refreshing).rejects.toMatchObject({ type: 'canceled' });
    expect(getSession()).toEqual({ status: 'anonymous', user: null, accessToken: null });
  });

  it('keeps the session and rejects when the refresh cannot reach the server', async () => {
    const { ended } = signedIn();
    const before = getSession();
    const hint = fakeHint(true);
    const endpoints = fakeEndpoints({ refresh: () => Promise.reject(appError('network', 0)) });

    await expect(refreshSession({ endpoints, hint })).rejects.toMatchObject({ type: 'network' });

    expect(getSession()).toEqual(before);
    expect(getSession().status).toBe('authenticated');
    expect(hint.clear).not.toHaveBeenCalled();
    expect(ended).not.toHaveBeenCalled();
  });

  it('starts a new request once the previous one has settled', async () => {
    signedIn();
    const endpoints = fakeEndpoints();
    const dependencies = { endpoints, hint: fakeHint(true) };

    await refreshSession(dependencies);
    await refreshSession(dependencies);

    expect(endpoints.refresh).toHaveBeenCalledTimes(2);
  });
});
