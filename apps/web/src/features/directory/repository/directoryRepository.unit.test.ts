import type { DirectorySpace } from '@masaha/shared/directory';
import { apiClient, setupApiClient } from '@shared/api';
import { AppError } from '@shared/errors';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { createDirectoryRepository } from './directoryRepository';

const SPACE: DirectorySpace = {
  id: 7,
  slug: 'focus-hub',
  nameEn: 'Focus Hub',
  nameAr: null,
  area: { id: 2, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  isVerified: true,
  days: null,
  cover: null,
  liveStatus: null,
};

const META = {
  currentPage: 2,
  limit: 20,
  totalPages: 3,
  totalRecords: 45,
  hasNextPage: true,
  hasPreviousPage: true,
};

/** The app's one client, wired as bootstrap wires it, answering every request with `answer`. */
function serve(answer: FakeAnswer) {
  const server = fakeAdapter(() => answer);
  apiClient.defaults.adapter = server.adapter;
  return server.requests;
}

const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  setupApiClient({ getAccessToken: () => null });
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

describe('the directory repository', () => {
  it('asks for a page of spaces with its query; a failure arrives as an AppError', async () => {
    const repository = createDirectoryRepository();
    const requests = serve({ status: 200, data: { success: true, data: [SPACE], meta: META } });

    await expect(repository.list({ limit: 20, q: 'Focus', page: 2 })).resolves.toEqual({
      data: [SPACE],
      meta: META,
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      method: 'get',
      url: '/spaces',
      params: { limit: 20, q: 'Focus', page: 2 },
    });

    serve({
      status: 422,
      headers: { 'x-request-id': 'req-9' },
      data: {
        success: false,
        error: { message: 'Invalid', requestId: 'req-9', type: 'validation' },
      },
    });
    const failure = await repository.list({ limit: 20 }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(AppError);
    expect(failure).toMatchObject({ type: 'validation', status: 422 });
  });
});
