import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeAdapter } from '../../../test/fakeAdapter';
import { installInterceptors } from '../setupApiClient';

/** A client whose server answers the first request 503 and every later one 200, so it retries once. */
function setup(initialToken: string | null) {
  const session = { token: initialToken };
  const server = fakeAdapter((_, index) => (index === 0 ? { status: 503 } : { status: 200 }));
  const client = axios.create({ adapter: server.adapter, baseURL: '/api/v1' });
  installInterceptors(client, { getAccessToken: () => session.token });
  return { client, session, requests: server.requests };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the authorization header', () => {
  it('sends the getter’s current token on a retry, when it changed during the wait', async () => {
    const { client, session, requests } = setup('first-token');

    const response = client.get('/spaces');
    await vi.advanceTimersByTimeAsync(0);
    session.token = 'renewed-token';
    await vi.advanceTimersByTimeAsync(1_000);
    await response;

    expect(requests.map((request) => request.headers.get('Authorization'))).toEqual([
      'Bearer first-token',
      'Bearer renewed-token',
    ]);
  });

  it('sends no token on a retry once the getter returns null', async () => {
    const { client, session, requests } = setup('first-token');

    const response = client.get('/spaces');
    await vi.advanceTimersByTimeAsync(0);
    session.token = null;
    await vi.advanceTimersByTimeAsync(1_000);
    await response;

    expect(requests[0]?.headers.get('Authorization')).toBe('Bearer first-token');
    expect(requests[1]?.headers.has('Authorization')).toBe(false);
  });

  it('keeps a header the caller set, on every attempt', async () => {
    const { client, requests } = setup('session-token');

    const response = client.get('/spaces', { headers: { Authorization: 'Bearer caller-token' } });
    await vi.advanceTimersByTimeAsync(1_000);
    await response;

    expect(requests.map((request) => request.headers.get('Authorization'))).toEqual([
      'Bearer caller-token',
      'Bearer caller-token',
    ]);
  });
});
