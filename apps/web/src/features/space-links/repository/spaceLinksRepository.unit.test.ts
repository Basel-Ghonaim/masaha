import type { AdminSpaceRow, ManagedSpace } from '@masaha/shared/space-links';
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

const ROW: AdminSpaceRow = {
  id: 7,
  slug: 'focus-hub',
  nameEn: 'Focus Hub',
  nameAr: null,
  area: { id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  state: 'unverified',
  owners: [],
  staleGroups: [],
  missingGroups: ['hours'],
  lastUpdatedAt: '2026-09-27T08:00:00.000Z',
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

  it('GETs a page of /admin/spaces and resolves to its rows and its meta', async () => {
    const meta = {
      currentPage: 1,
      limit: 20,
      totalPages: 1,
      totalRecords: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    const requests = serve({ status: 200, data: { success: true, data: [ROW], meta } });

    await expect(createSpaceLinksRepository().adminSpaces({ page: 1 })).resolves.toEqual({
      data: [ROW],
      meta,
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ method: 'get', baseURL: '/api/v1', url: '/admin/spaces' });
    expect(new URLSearchParams(requests[0]?.params as Record<string, string>).toString()).toBe(
      'page=1',
    );
  });

  it.each([
    [{ q: 'Focus Hub' }, 'q=Focus+Hub'],
    [{ status: 'hidden' as const }, 'status=hidden'],
    [{ governorateId: 2 }, 'governorateId=2'],
    [{ areaId: 12 }, 'areaId=12'],
    [{ stale: true as const }, 'stale=true'],
    [{ page: 3 }, 'page=3'],
  ])('sends the filter %j as its query parameter', async (request, query) => {
    const requests = serve({ status: 200, data: { success: true, data: [], meta: {} } });

    await createSpaceLinksRepository().adminSpaces(request);

    expect(apiClient.getUri(requests[0])).toBe(`/api/v1/admin/spaces?${query}`);
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
