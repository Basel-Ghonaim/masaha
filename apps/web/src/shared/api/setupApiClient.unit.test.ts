import { AppError } from '@shared/errors';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../test/fakeAdapter';
import { apiClient } from './client';
import { setupApiClient } from './setupApiClient';

/** A server for `apiClient`, through the per-request `adapter` option. */
function server(answer: FakeAnswer) {
  return fakeAdapter(() => answer);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('apiClient', () => {
  it('calls /api/v1 relatively, with a 15 s timeout a request may override', async () => {
    const { adapter, requests } = server({ status: 200 });

    await apiClient.get('/spaces', { adapter });
    await apiClient.get('/spaces', { adapter, timeout: 5_000 });

    expect(requests[0]).toMatchObject({ baseURL: '/api/v1', url: '/spaces', timeout: 15_000 });
    expect(requests[1]?.timeout).toBe(5_000);
  });
});

describe('setupApiClient', () => {
  it('sends the token the getter returns as a Bearer token', async () => {
    setupApiClient({ getAccessToken: () => 'the-token' });
    const { adapter, requests } = server({ status: 200 });

    await apiClient.get('/me', { adapter });

    expect(requests[0]?.headers.get('Authorization')).toBe('Bearer the-token');
  });

  it('sends no Authorization header when the getter returns null', async () => {
    setupApiClient({ getAccessToken: () => null });
    const { adapter, requests } = server({ status: 200 });

    await apiClient.get('/spaces', { adapter });

    expect(requests[0]?.headers.has('Authorization')).toBe(false);
  });

  it.each<[string, FakeAnswer]>([
    ['a 4xx', { status: 404 }],
    ['a network failure', { failure: 'ERR_NETWORK' }],
    ['a cancellation', { failure: 'ERR_CANCELED' }],
  ])('rejects %s as an AppError', async (_, answer) => {
    vi.useFakeTimers();
    setupApiClient({ getAccessToken: () => null });
    const { adapter } = server(answer);

    const outcome = apiClient.get('/spaces', { adapter }).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(3_000);

    expect(await outcome).toBeInstanceOf(AppError);
  });

  it('rejects a failure that is not Axios’s as an AppError', async () => {
    setupApiClient({ getAccessToken: () => null });
    const adapter = () => Promise.reject(new TypeError('broken adapter'));

    await expect(apiClient.get('/spaces', { adapter })).rejects.toMatchObject({ type: 'unknown' });
  });

  it('lets the retry see the raw 503 before normalising it', async () => {
    vi.useFakeTimers();
    setupApiClient({ getAccessToken: () => null });
    const { adapter, requests } = server({ status: 503 });

    const outcome = apiClient.get('/spaces', { adapter }).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(3_000);

    // Retried, so the retry read the status: had the error been normalised first, it would not be.
    expect(requests).toHaveLength(3);
    expect(await outcome).toMatchObject({ type: 'service_unavailable', status: 503 });
  });

  it('replaces the previous setup when set up again, so nothing runs twice', async () => {
    vi.useFakeTimers();
    setupApiClient({ getAccessToken: () => 'first' });
    setupApiClient({ getAccessToken: () => 'second' });
    const { adapter, requests } = server({ status: 503 });

    const outcome = apiClient.get('/spaces', { adapter }).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(10_000);
    await outcome;

    expect(requests).toHaveLength(3);
    expect(requests[0]?.headers.get('Authorization')).toBe('Bearer second');
  });
});
