import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { aSession, appError, deferred, fakeEndpoints, fakeHint } from '../../test/fakeSession';
import type { Session } from './model';
import { restoreSession } from './restore';
import { getSession, onSessionEnded, onSessionEstablished } from './store';

describe('restoreSession', () => {
  it('is anonymous at once, with no request, when there is no hint', async () => {
    const endpoints = fakeEndpoints();

    await restoreSession({ endpoints, hint: fakeHint(false) });

    expect(getSession().status).toBe('anonymous');
    expect(endpoints.refresh).not.toHaveBeenCalled();
  });

  it('holds the user and the token the refresh returns', async () => {
    const session = aSession({ name: 'Omar' }, 'token-restored');
    const endpoints = fakeEndpoints({ refresh: () => Promise.resolve(session) });

    await restoreSession({ endpoints, hint: fakeHint(true) });

    expect(getSession()).toEqual({
      status: 'authenticated',
      user: session.user,
      accessToken: 'token-restored',
    });
  });

  it('is restoring while the refresh is on its way', async () => {
    const answer = deferred<Session>();
    const endpoints = fakeEndpoints({ refresh: () => answer.promise });

    const restoring = restoreSession({ endpoints, hint: fakeHint(true) });

    expect(getSession().status).toBe('restoring');
    answer.resolve(aSession());
    await restoring;
  });

  it.each([
    ['unauthorized', 401, undefined],
    ['forbidden', 403, 'ACCOUNT_SUSPENDED'],
  ] as const)(
    'is anonymous, clears the hint and runs no ended listener when the refresh answers %s %d %s',
    async (type, status, code) => {
      const ended = vi.fn();
      onTestFinished(onSessionEnded(ended));
      const hint = fakeHint(true);
      const endpoints = fakeEndpoints({
        refresh: () => Promise.reject(appError(type, status, code)),
      });

      await restoreSession({ endpoints, hint });

      expect(getSession().status).toBe('anonymous');
      expect(hint.clear).toHaveBeenCalledOnce();
      expect(ended).not.toHaveBeenCalled();
    },
  );

  it('makes one request when two restores run together', async () => {
    const answer = deferred<Session>();
    const endpoints = fakeEndpoints({ refresh: () => answer.promise });
    const dependencies = { endpoints, hint: fakeHint(true) };

    const first = restoreSession(dependencies);
    const second = restoreSession(dependencies);
    answer.resolve(aSession());
    await Promise.all([first, second]);

    expect(endpoints.refresh).toHaveBeenCalledOnce();
    expect(getSession().status).toBe('authenticated');
  });

  it('stays authenticated, and logs the error, when an established listener throws', async () => {
    const failure = new Error('A listener failed');
    onTestFinished(
      onSessionEstablished(() => {
        throw failure;
      }),
    );
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    onTestFinished(() => {
      logged.mockRestore();
    });
    const endpoints = fakeEndpoints();

    await expect(restoreSession({ endpoints, hint: fakeHint(true) })).resolves.toBeUndefined();

    expect(getSession().status).toBe('authenticated');
    expect(logged).toHaveBeenCalledExactlyOnceWith(failure);
    expect(endpoints.refresh).toHaveBeenCalledOnce();
  });

  it.each([
    ['network', 0, 'offline'],
    ['timeout', 0, 'offline'],
    ['server', 500, 'error'],
    ['service_unavailable', 503, 'error'],
    ['server', 502, 'error'],
    ['rate_limit', 429, 'error'],
    ['forbidden', 403, 'error'],
  ] as const)('is unreachable (%s %d → %s) and keeps the hint', async (type, status, reason) => {
    const hint = fakeHint(true);
    const endpoints = fakeEndpoints({ refresh: () => Promise.reject(appError(type, status)) });

    await restoreSession({ endpoints, hint });

    expect(getSession()).toEqual({
      status: 'unreachable',
      reason,
      user: null,
      accessToken: null,
    });
    expect(hint.clear).not.toHaveBeenCalled();
  });

  it('restores the session when retried after being unreachable', async () => {
    const hint = fakeHint(true);
    const endpoints = fakeEndpoints({ refresh: () => Promise.reject(appError('network', 0)) });
    await restoreSession({ endpoints, hint });
    expect(getSession().status).toBe('unreachable');

    endpoints.refresh.mockImplementation(() => Promise.resolve(aSession()));
    await restoreSession({ endpoints, hint });

    expect(getSession().status).toBe('authenticated');
    expect(endpoints.refresh).toHaveBeenCalledTimes(2);
  });
});
