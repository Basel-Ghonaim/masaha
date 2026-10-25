import type { SpaceOccupancyNow } from '@masaha/shared/occupancy';
import { apiClient, setupApiClient } from '@shared/api';
import { AppError } from '@shared/errors';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { bodyOf } from '../../../test/fakeTransport';
import { createOccupancyRepository } from './occupancyRepository';

/** The app's one client, wired as bootstrap wires it, answering every request with `answer`. */
function serve(answer: FakeAnswer) {
  const server = fakeAdapter(() => answer);
  apiClient.defaults.adapter = server.adapter;
  return server.requests;
}

const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  setupApiClient({ getAccessToken: () => 'token-1' });
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

describe('the occupancy repository', () => {
  it('reads and sets a space’s capacity on the managed route', async () => {
    const repository = createOccupancyRepository();
    const requests = serve({ status: 200, data: { success: true, data: { capacity: 40 } } });

    await expect(repository.getCapacity(7)).resolves.toEqual({ capacity: 40 });
    await repository.setCapacity(7, { capacity: null });

    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'get /manage/spaces/7/capacity',
      'put /manage/spaces/7/capacity',
    ]);
    expect(bodyOf(requests[1])).toEqual({ capacity: null });
  });

  it('reads the state now; sets and clears the override with its body', async () => {
    const repository = createOccupancyRepository();
    const now: SpaceOccupancyNow = {
      status: 'FULL',
      capacity: 40,
      present: 0,
      override: { state: 'FULL', until: '2026-10-24T12:00:00.000Z' },
      people: [],
    };
    const requests = serve({ status: 200, data: { success: true, data: now } });

    await expect(repository.stateNow(7)).resolves.toEqual(now);
    await expect(repository.setOverride(7, { state: 'FULL', duration: 'HOUR_1' })).resolves.toEqual(
      now,
    );
    await repository.clearOverride(7);

    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'get /manage/spaces/7/occupancy',
      'put /manage/spaces/7/status-override',
      'delete /manage/spaces/7/status-override',
    ]);
    expect(bodyOf(requests[1])).toEqual({ state: 'FULL', duration: 'HOUR_1' });
  });

  it('rejects a refused override as an AppError with its code', async () => {
    const repository = createOccupancyRepository();
    serve({
      status: 409,
      data: {
        success: false,
        error: { type: 'conflict', code: 'SPACE_NOT_OPEN', message: 'Closed', requestId: 'r-1' },
      },
    });

    const failure = repository.setOverride(7, { state: 'FULL', duration: 'MINUTES_30' });

    await expect(failure).rejects.toBeInstanceOf(AppError);
    await expect(failure).rejects.toMatchObject({ type: 'conflict', code: 'SPACE_NOT_OPEN' });
  });
});
