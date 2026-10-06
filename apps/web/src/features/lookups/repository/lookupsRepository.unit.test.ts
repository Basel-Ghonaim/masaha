import type { AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import { apiClient, setupApiClient } from '@shared/api';
import { AppError } from '@shared/errors';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { createLookupsRepository } from './lookupsRepository';

const GAZA: AdminGovernorateWithAreas = {
  id: 2,
  nameAr: 'محافظة غزة',
  nameEn: 'Gaza City',
  isActive: true,
  areas: [{ id: 5, governorateId: 2, nameAr: 'الرمال', nameEn: 'Al-Rimal', isActive: true }],
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

describe('the lookups repository', () => {
  it('GETs /admin/governorates and resolves to the unwrapped list', async () => {
    const requests = serve({ status: 200, data: { success: true, data: [GAZA] } });

    await expect(createLookupsRepository().governorates()).resolves.toEqual([GAZA]);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      method: 'get',
      baseURL: '/api/v1',
      url: '/admin/governorates',
    });
  });

  it('rejects a refusal as an AppError, with its type', async () => {
    serve({
      status: 403,
      data: {
        success: false,
        error: { type: 'forbidden', message: 'Fake refusal', requestId: 'req-1' },
      },
    });

    const failure: unknown = await createLookupsRepository()
      .governorates()
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AppError);
    expect(failure).toMatchObject({ type: 'forbidden', status: 403 });
  });
});
