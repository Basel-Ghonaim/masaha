import { apiClient, setupApiClient } from '@shared/api';
import { AppError } from '@shared/errors';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { createSpacesRepository } from './spacesRepository';

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

describe('the spaces repository', () => {
  it.each([true, false])('PUTs { isHidden: %s } to the space’s hidden flag', async (isHidden) => {
    const requests = serve({ status: 204 });

    await expect(createSpacesRepository().setHidden(7, isHidden)).resolves.toBeUndefined();
    expect(requests[0]).toMatchObject({ method: 'put', url: '/admin/spaces/7/hidden' });
    expect(JSON.parse(String(requests[0]?.data))).toEqual({ isHidden });
  });

  it('DELETEs the space', async () => {
    const requests = serve({ status: 204 });

    await expect(createSpacesRepository().remove(7)).resolves.toBeUndefined();
    expect(requests[0]).toMatchObject({ method: 'delete', url: '/admin/spaces/7' });
  });

  it('POSTs the space’s restore', async () => {
    const requests = serve({ status: 204 });

    await expect(createSpacesRepository().restore(7)).resolves.toBeUndefined();
    expect(requests[0]).toMatchObject({ method: 'post', url: '/admin/spaces/7/restore' });
  });

  it('rejects a refusal as an AppError, with its type', async () => {
    serve({
      status: 404,
      data: {
        success: false,
        error: { type: 'not_found', message: 'Fake refusal', requestId: 'req-1' },
      },
    });

    const failure: unknown = await createSpacesRepository()
      .remove(7)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AppError);
    expect(failure).toMatchObject({ type: 'not_found', status: 404, requestId: 'req-1' });
  });
});
