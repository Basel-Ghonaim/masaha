import { apiClient, setupApiClient } from '@shared/api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { createFavoritesRepository } from './favoritesRepository';

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

describe('the favourites repository', () => {
  it('saves and removes a space by its id, with no body and no key', async () => {
    const requests = serve(() => ({ status: 204 }));
    const repository = createFavoritesRepository();

    await expect(repository.save(7)).resolves.toBeUndefined();
    await expect(repository.remove(7)).resolves.toBeUndefined();

    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'post /me/favorites/7',
      'delete /me/favorites/7',
    ]);
    for (const request of requests) {
      expect(request.data).toBeUndefined();
      expect(request.headers['Idempotency-Key']).toBeUndefined();
    }
  });

  it('rejects with the AppError the transport made', async () => {
    serve(() => ({
      status: 409,
      data: {
        success: false,
        error: {
          type: 'conflict',
          code: 'FAVORITES_LIMIT_REACHED',
          message: 'Full',
          requestId: 'r',
        },
      },
    }));

    await expect(createFavoritesRepository().save(7)).rejects.toMatchObject({
      status: 409,
      code: 'FAVORITES_LIMIT_REACHED',
    });
  });
});
