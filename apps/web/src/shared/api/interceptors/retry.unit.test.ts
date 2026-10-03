import { AppError } from '@shared/errors';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { installInterceptors } from '../setupApiClient';

/** A client with the whole chain, and a server that gives every request the same answer. */
function serverAnswering(answer: FakeAnswer | ((index: number) => FakeAnswer)) {
  const server = fakeAdapter((_, index) => (typeof answer === 'function' ? answer(index) : answer));
  const client = axios.create({ adapter: server.adapter });
  installInterceptors(client, { getAccessToken: () => null });
  return { client, requests: server.requests };
}

/** Settles a request without leaving its rejection unhandled while the timers run. */
function settled(request: Promise<unknown>): Promise<unknown> {
  return request.then(
    (response) => response,
    (error: unknown) => error,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the retry', () => {
  it('retries a GET answered 503 twice, after 1 s and then 2 s, then gives up', async () => {
    const { client, requests } = serverAnswering({ status: 503 });

    const outcome = settled(client.get('/spaces'));
    await vi.advanceTimersByTimeAsync(0);
    expect(requests).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(999);
    expect(requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(1_999);
    expect(requests).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests).toHaveLength(3);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(requests).toHaveLength(3);
    expect(await outcome).toMatchObject({ type: 'service_unavailable' });
  });

  it.each(['ERR_NETWORK', 'ETIMEDOUT', 'ECONNABORTED'] as const)(
    'retries a GET that failed with %s up to the limit',
    async (failure) => {
      const { client, requests } = serverAnswering({ failure });

      const outcome = settled(client.get('/spaces'));
      await vi.advanceTimersByTimeAsync(3_000);

      expect(requests).toHaveLength(3);
      expect(await outcome).toBeInstanceOf(AppError);
    },
  );

  it('resolves a GET whose retry is answered', async () => {
    const { client, requests } = serverAnswering((index) =>
      index === 0 ? { status: 503 } : { status: 200, data: 'ok' },
    );

    const outcome = settled(client.get('/spaces'));
    await vi.advanceTimersByTimeAsync(1_000);

    expect(requests).toHaveLength(2);
    expect(await outcome).toMatchObject({ status: 200, data: 'ok' });
  });

  it('never retries a POST without an Idempotency-Key', async () => {
    const { client, requests } = serverAnswering({ status: 503 });

    const outcome = settled(client.post('/visits', {}));
    await vi.advanceTimersByTimeAsync(3_000);

    expect(requests).toHaveLength(1);
    expect(await outcome).toMatchObject({ type: 'service_unavailable' });
  });

  it('retries a POST that carries an Idempotency-Key, with the same key', async () => {
    const { client, requests } = serverAnswering({ status: 503 });
    const key = '5f0c6b1e-2d7a-4c1e-9a43-8b9d6e7f1a20';

    const outcome = settled(client.post('/visits', {}, { headers: { 'Idempotency-Key': key } }));
    await vi.advanceTimersByTimeAsync(3_000);

    expect(requests).toHaveLength(3);
    expect(requests.map((request) => request.headers.get('Idempotency-Key'))).toEqual([
      key,
      key,
      key,
    ]);
    await outcome;
  });

  it.each([400, 401, 404, 409, 422, 429])('never retries a GET answered %i', async (status) => {
    const { client, requests } = serverAnswering({ status });

    const outcome = settled(client.get('/spaces'));
    await vi.advanceTimersByTimeAsync(3_000);

    expect(requests).toHaveLength(1);
    expect(await outcome).toMatchObject({ status });
  });

  it('stops waiting at once when the request is cancelled during the backoff, leaving no timer', async () => {
    const { client, requests } = serverAnswering({ status: 503 });
    const controller = new AbortController();

    const outcome = settled(client.get('/spaces', { signal: controller.signal }));
    await vi.advanceTimersByTimeAsync(500);
    expect(requests).toHaveLength(1);
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);

    expect(await outcome).toMatchObject({ type: 'canceled' });
    expect(vi.getTimerCount()).toBe(0);
    expect(requests).toHaveLength(1);
  });

  it('never retries a canceled GET', async () => {
    const { client, requests } = serverAnswering({ failure: 'ERR_CANCELED' });

    const outcome = settled(client.get('/spaces'));
    await vi.advanceTimersByTimeAsync(3_000);

    expect(requests).toHaveLength(1);
    expect(await outcome).toMatchObject({ type: 'canceled' });
  });
});
