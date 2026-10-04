import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession, deferred } from '../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { hasSessionHint, setSessionHint, stubCookies } from '../../../test/sessionHint';
import { restoreSession } from './restore';
import { getSession, onSessionEnded, onSessionEstablished } from '../store';

beforeEach(() => {
  stubCookies();
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('restoreSession', () => {
  it('is anonymous at once, with no request, when there is no hint', async () => {
    setSessionHint(false);
    const requests = fakeTransport(() => ok(aSession()));

    await restoreSession();

    expect(getSession().status).toBe('anonymous');
    expect(requests).toHaveLength(0);
  });

  it('holds the user and the token the refresh returns', async () => {
    setSessionHint(true);
    const session = aSession({ name: 'Omar' }, 'token-restored');
    fakeTransport(() => ok(session));

    await restoreSession();

    expect(getSession()).toEqual({
      status: 'authenticated',
      user: session.user,
      accessToken: 'token-restored',
    });
  });

  it('is restoring while the refresh is on its way', async () => {
    setSessionHint(true);
    const answer = deferred<FakeAnswer>();
    fakeTransport(() => answer.promise);

    const restoring = restoreSession();

    expect(getSession().status).toBe('restoring');
    answer.resolve(ok(aSession()));
    await restoring;
  });

  it.each([
    ['unauthorized', 401, undefined],
    ['forbidden', 403, 'ACCOUNT_SUSPENDED'],
  ] as const)(
    'is anonymous, clears the hint and runs no ended listener when the refresh answers %s %d %s',
    async (type, status, code) => {
      setSessionHint(true);
      const ended = vi.fn();
      onTestFinished(onSessionEnded(ended));
      fakeTransport(() => refused(status, { type, ...(code ? { code } : {}) }));

      await restoreSession();

      expect(getSession().status).toBe('anonymous');
      expect(hasSessionHint()).toBe(false);
      expect(ended).not.toHaveBeenCalled();
    },
  );

  it('makes one request when two restores run together', async () => {
    setSessionHint(true);
    const answer = deferred<FakeAnswer>();
    const requests = fakeTransport(() => answer.promise);

    const first = restoreSession();
    const second = restoreSession();
    answer.resolve(ok(aSession()));
    await Promise.all([first, second]);

    expect(requests).toHaveLength(1);
    expect(getSession().status).toBe('authenticated');
  });

  it('stays authenticated, and logs the error, when an established listener throws', async () => {
    setSessionHint(true);
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
    const requests = fakeTransport(() => ok(aSession()));

    await expect(restoreSession()).resolves.toBeUndefined();

    expect(getSession().status).toBe('authenticated');
    expect(logged).toHaveBeenCalledExactlyOnceWith(failure);
    expect(requests).toHaveLength(1);
  });

  it.each([
    ['network', { failure: 'ERR_NETWORK' }, 'offline'],
    ['timeout', { failure: 'ECONNABORTED' }, 'offline'],
    ['server 500', refused(500, { type: 'server' }), 'error'],
    ['service_unavailable 503', refused(503, { type: 'service_unavailable' }), 'error'],
    ['a proxy 502', { status: 502 }, 'error'],
    ['rate_limit 429', refused(429, { type: 'rate_limit' }), 'error'],
    ['forbidden 403', refused(403, { type: 'forbidden' }), 'error'],
  ] satisfies [string, FakeAnswer, string][])(
    'is unreachable (%s → %s) and keeps the hint',
    async (_case, answer, reason) => {
      setSessionHint(true);
      fakeTransport(() => answer);

      await restoreSession();

      expect(getSession()).toEqual({
        status: 'unreachable',
        reason,
        user: null,
        accessToken: null,
      });
      expect(hasSessionHint()).toBe(true);
    },
  );

  it('restores the session when retried after being unreachable', async () => {
    setSessionHint(true);
    const answers: FakeAnswer[] = [{ failure: 'ERR_NETWORK' }, ok(aSession())];
    const requests = fakeTransport(() => answers.shift() ?? ok(aSession()));
    await restoreSession();
    expect(getSession().status).toBe('unreachable');

    await restoreSession();

    expect(getSession().status).toBe('authenticated');
    expect(requests).toHaveLength(2);
  });
});
