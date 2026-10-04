import type { ManagedSpace } from '@masaha/shared/space-links';
import { apiClient, setupApiClient } from '@shared/api';
import { AppError } from '@shared/errors';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { createSpaceLinksRepository } from './spaceLinksRepository';

const HUB: ManagedSpace = {
  spaceId: 7,
  role: 'OWNER',
  slug: 'hub',
  nameAr: 'هب',
  nameEn: 'Hub',
  area: { nameAr: 'الرمال', nameEn: 'Al-Rimal' },
};

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

describe('the space-links repository', () => {
  it('GETs /manage/spaces and resolves to the unwrapped list of spaces', async () => {
    const requests = serve({ status: 200, data: { success: true, data: [HUB] } });

    await expect(createSpaceLinksRepository().mySpaces()).resolves.toEqual([HUB]);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ method: 'get', baseURL: '/api/v1', url: '/manage/spaces' });
  });

  it('rejects a refusal as an AppError, with its type and code', async () => {
    serve({
      status: 403,
      data: {
        success: false,
        error: {
          type: 'forbidden',
          code: 'PASSWORD_CHANGE_REQUIRED',
          message: 'Fake refusal',
          requestId: 'req-1',
        },
      },
    });

    const failure: unknown = await createSpaceLinksRepository()
      .mySpaces()
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AppError);
    expect(failure).toMatchObject({
      type: 'forbidden',
      status: 403,
      code: 'PASSWORD_CHANGE_REQUIRED',
    });
  });
});
