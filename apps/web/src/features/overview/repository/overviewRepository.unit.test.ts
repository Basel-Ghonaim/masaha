import { apiClient, setupApiClient } from '@shared/api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { createOverviewRepository } from './overviewRepository';

/** The app's one client, wired as bootstrap wires it, answering every request with `answer`. */
function serve(answer: () => FakeAnswer) {
  const server = fakeAdapter(() => answer());
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

describe('the overview repository', () => {
  it('reads the owner’s overview of the space, unwrapped', async () => {
    const requests = serve(() => ({ status: 200, data: { success: true, data: { at: 'x' } } }));

    await expect(createOverviewRepository().owner(7)).resolves.toEqual({ at: 'x' });
    expect(requests[0]?.method).toBe('get');
    expect(requests[0]?.url).toBe('/manage/spaces/7/overview');
  });

  it('reads the admin’s overview of the platform, unwrapped', async () => {
    const requests = serve(() => ({ status: 200, data: { success: true, data: { at: 'y' } } }));

    await expect(createOverviewRepository().admin()).resolves.toEqual({ at: 'y' });
    expect(requests[0]?.method).toBe('get');
    expect(requests[0]?.url).toBe('/admin/overview');
  });

  it('rejects a refusal as an AppError', async () => {
    serve(() => ({
      status: 403,
      data: { success: false, error: { type: 'forbidden', message: 'No', requestId: 'r' } },
    }));

    await expect(createOverviewRepository().owner(7)).rejects.toMatchObject({
      type: 'forbidden',
      status: 403,
    });
  });
});
