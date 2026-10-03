import { AppError } from '@shared/errors';
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failure, fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { installInterceptors } from '../setupApiClient';

const OLD = 'old-token';
const NEW = 'new-token';

/** A stand-in session: the token the getter returns, which a successful refresh replaces. */
type Session = { token: string | null };

/** The server accepts the new token only. */
function acceptsNewToken(config: InternalAxiosRequestConfig): FakeAnswer {
  return config.headers.get('Authorization') === `Bearer ${NEW}`
    ? { status: 200, data: 'ok' }
    : { status: 401 };
}

function renewTo(session: Session) {
  return vi.fn(() => {
    session.token = NEW;
    return Promise.resolve();
  });
}

function setup({
  token = OLD,
  refresh = renewTo,
  answer = acceptsNewToken,
}: {
  token?: string | null;
  refresh?: (session: Session) => () => Promise<void>;
  answer?: (config: InternalAxiosRequestConfig, index: number) => FakeAnswer | Promise<FakeAnswer>;
} = {}) {
  const session: Session = { token };
  const renew = refresh(session);
  const server = fakeAdapter(answer);
  const client = axios.create({ adapter: server.adapter, baseURL: '/api/v1' });
  installInterceptors(client, { getAccessToken: () => session.token, refresh: renew });
  return { client, session, refresh: renew, requests: server.requests };
}

function authorizationOf(request: InternalAxiosRequestConfig | undefined) {
  return request?.headers.get('Authorization');
}

afterEach(() => {
  vi.useRealTimers();
});

describe('the refresh on 401', () => {
  it('does not refresh a 401 when there is no token', async () => {
    const { client, refresh, requests } = setup({ token: null });

    await expect(client.get('/me')).rejects.toMatchObject({ type: 'unauthorized' });
    expect(refresh).not.toHaveBeenCalled();
    expect(requests).toHaveLength(1);
  });

  it('refreshes once and replays the request once, with the new token', async () => {
    const { client, refresh, requests } = setup();

    const response = await client.get<string>('/me');

    expect(response.data).toBe('ok');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(2);
    expect(authorizationOf(requests[0])).toBe(`Bearer ${OLD}`);
    expect(authorizationOf(requests[1])).toBe(`Bearer ${NEW}`);
  });

  it('refreshes exactly once for concurrent 401s, and replays each with the new token', async () => {
    let release: (() => void) | undefined;
    const { client, refresh, requests } = setup({
      refresh: (session) =>
        vi.fn(
          () =>
            new Promise<void>((resolve) => {
              release = () => {
                session.token = NEW;
                resolve();
              };
            }),
        ),
    });

    const responses = Promise.all([
      client.get<string>('/a'),
      client.get<string>('/b'),
      client.get<string>('/c'),
    ]);
    await vi.waitFor(() => {
      expect(requests).toHaveLength(3);
      expect(refresh).toHaveBeenCalledTimes(1);
    });
    release?.();

    expect((await responses).map((response) => response.data)).toEqual(['ok', 'ok', 'ok']);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(6);
    expect(requests.slice(3).map(authorizationOf)).toEqual([
      `Bearer ${NEW}`,
      `Bearer ${NEW}`,
      `Bearer ${NEW}`,
    ]);
  });

  it('replays a late 401 for a token already renewed with the current one, without refreshing again', async () => {
    let releaseLate: (() => void) | undefined;
    const lateAnswer = new Promise<void>((resolve) => {
      releaseLate = resolve;
    });
    const { client, refresh, requests } = setup({
      // The server holds back its answer to /late's first attempt, sent with the old token.
      answer: async (config) => {
        if (config.url === '/late' && authorizationOf(config) === `Bearer ${OLD}`) await lateAnswer;
        return acceptsNewToken(config);
      },
    });

    const early = client.get<string>('/early');
    const late = client.get<string>('/late');
    expect((await early).data).toBe('ok');
    expect(refresh).toHaveBeenCalledTimes(1);
    releaseLate?.();

    expect((await late).data).toBe('ok');
    expect(refresh).toHaveBeenCalledTimes(1);
    const lateAttempts = requests.filter((request) => request.url === '/late');
    expect(lateAttempts.map(authorizationOf)).toEqual([`Bearer ${OLD}`, `Bearer ${NEW}`]);
  });

  it('holds every waiting request until the refresh fails, then rejects each with the refresh’s AppError', async () => {
    let fail: ((reason: unknown) => void) | undefined;
    const { client, refresh, requests } = setup({
      refresh: () =>
        vi.fn(
          () =>
            new Promise<void>((_, reject) => {
              fail = reject;
            }),
        ),
    });

    let settledCount = 0;
    const outcomes = Promise.allSettled(
      ['/a', '/b', '/c'].map((path) =>
        client.get(path).finally(() => {
          settledCount += 1;
        }),
      ),
    );
    await vi.waitFor(() => {
      expect(requests).toHaveLength(3);
      expect(refresh).toHaveBeenCalledTimes(1);
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settledCount).toBe(0);

    // The refresh fails with no answer, a type the original 401s cannot have, so each rejection is
    // the refresh's own failure.
    fail?.(failure({ failure: 'ERR_NETWORK' }));

    const results = await outcomes;
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(3);
    for (const result of results) {
      expect(result.status).toBe('rejected');
      expect(result.status === 'rejected' && result.reason).toBeInstanceOf(AppError);
      expect(result.status === 'rejected' && result.reason).toMatchObject({ type: 'network' });
    }
  });

  it.each([
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/logout',
    '/auth/password/reset',
    'auth/refresh',
    'http://localhost:5320/api/v1/auth/refresh',
  ])('never refreshes a 401 from %s', async (path) => {
    const { client, refresh, requests } = setup();

    await expect(client.post(path)).rejects.toMatchObject({ type: 'unauthorized' });
    expect(refresh).not.toHaveBeenCalled();
    expect(requests).toHaveLength(1);
  });

  it('does not refresh again when the replay is answered 401', async () => {
    const { client, refresh, requests } = setup({ answer: () => ({ status: 401 }) });

    await expect(client.get('/me')).rejects.toMatchObject({ type: 'unauthorized' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(2);
  });

  it('refreshes once for a retried request answered 401, when the refresh fails', async () => {
    vi.useFakeTimers();
    const { client, refresh, requests } = setup({
      refresh: () => vi.fn(() => Promise.reject(failure({ status: 401 }))),
      answer: (_, index) => (index === 0 ? { status: 503 } : { status: 401 }),
    });

    const outcome = client.get('/me').catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(1_000);

    expect(await outcome).toMatchObject({ type: 'unauthorized' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(2);
  });
});
