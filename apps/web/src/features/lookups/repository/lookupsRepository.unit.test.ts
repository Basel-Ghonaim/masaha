import type { AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import { apiClient, setupApiClient } from '@shared/api';
import { AppError } from '@shared/errors';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { bodyOf } from '../../../test/fakeTransport';
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

  it('PATCHes a governorate with the fields to change, and resolves to it', async () => {
    const hidden = { id: 2, nameAr: 'محافظة غزة', nameEn: 'Gaza City', isActive: false };
    const requests = serve({ status: 200, data: { success: true, data: hidden } });

    await expect(
      createLookupsRepository().editGovernorate(2, { isActive: false }),
    ).resolves.toEqual(hidden);
    expect(requests[0]).toMatchObject({ method: 'patch', url: '/admin/governorates/2' });
    expect(bodyOf(requests[0])).toEqual({ isActive: false });
  });

  it('PATCHes an area with the fields to change, and resolves to it', async () => {
    const area = { id: 5, governorateId: 2, nameAr: 'الرمال', nameEn: 'Al-Rimal', isActive: true };
    const requests = serve({ status: 200, data: { success: true, data: area } });

    await expect(createLookupsRepository().editArea(5, { isActive: true })).resolves.toEqual(area);
    expect(requests[0]).toMatchObject({ method: 'patch', url: '/admin/areas/5' });
    expect(bodyOf(requests[0])).toEqual({ isActive: true });
  });

  it('PUTs the governorates’ order as their ids, and resolves to nothing on 204', async () => {
    const requests = serve({ status: 204 });

    await expect(createLookupsRepository().orderGovernorates([3, 2])).resolves.toBeUndefined();
    expect(requests[0]).toMatchObject({ method: 'put', url: '/admin/governorates/order' });
    expect(bodyOf(requests[0])).toEqual({ ids: [3, 2] });
  });

  it('PUTs a governorate’s areas’ order as their ids, and resolves to nothing on 204', async () => {
    const requests = serve({ status: 204 });

    await expect(createLookupsRepository().orderAreas(2, [6, 5])).resolves.toBeUndefined();
    expect(requests[0]).toMatchObject({ method: 'put', url: '/admin/governorates/2/areas/order' });
    expect(bodyOf(requests[0])).toEqual({ ids: [6, 5] });
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
