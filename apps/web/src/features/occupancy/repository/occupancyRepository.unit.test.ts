import { apiClient, setupApiClient } from '@shared/api';
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
});
