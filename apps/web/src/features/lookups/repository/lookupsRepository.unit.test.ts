import type { AdminAmenity, AdminGovernorateWithAreas } from '@masaha/shared/lookups';
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

const WIFI: AdminAmenity = {
  id: 4,
  key: 'internet',
  nameAr: 'إنترنت',
  nameEn: 'Internet',
  icon: 'wifi',
  isActive: true,
  isFilterable: false,
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

  it('POSTs a new governorate’s names, and resolves to the governorate added', async () => {
    const added = { id: 9, nameAr: 'محافظة جديدة', nameEn: 'New', isActive: true };
    const requests = serve({ status: 201, data: { success: true, data: added } });

    await expect(
      createLookupsRepository().addGovernorate({ nameAr: 'محافظة جديدة', nameEn: 'New' }),
    ).resolves.toEqual(added);
    expect(requests[0]).toMatchObject({ method: 'post', url: '/admin/governorates' });
    expect(bodyOf(requests[0])).toEqual({ nameAr: 'محافظة جديدة', nameEn: 'New' });
  });

  it('POSTs a new area with its governorate, and resolves to the area added', async () => {
    const request = { governorateId: 2, nameAr: 'الدرج', nameEn: 'Ad-Daraj' };
    const added = { id: 10, ...request, isActive: true };
    const requests = serve({ status: 201, data: { success: true, data: added } });

    await expect(createLookupsRepository().addArea(request)).resolves.toEqual(added);
    expect(requests[0]).toMatchObject({ method: 'post', url: '/admin/areas' });
    expect(bodyOf(requests[0])).toEqual(request);
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

  it('GETs /admin/amenities and resolves to the unwrapped list', async () => {
    const requests = serve({ status: 200, data: { success: true, data: [WIFI] } });

    await expect(createLookupsRepository().amenities()).resolves.toEqual([WIFI]);
    expect(requests[0]).toMatchObject({ method: 'get', url: '/admin/amenities' });
  });

  it('POSTs a new amenity’s names, icon and filter flag, and resolves to the amenity added', async () => {
    const request = {
      nameAr: 'إنترنت',
      nameEn: 'Internet',
      icon: 'wifi' as const,
      isFilterable: false,
    };
    const requests = serve({ status: 201, data: { success: true, data: WIFI } });

    await expect(createLookupsRepository().addAmenity(request)).resolves.toEqual(WIFI);
    expect(requests[0]).toMatchObject({ method: 'post', url: '/admin/amenities' });
    expect(bodyOf(requests[0])).toEqual(request);
  });

  it('PATCHes an amenity with the fields to change, and resolves to it', async () => {
    const off = { ...WIFI, isFilterable: true };
    const requests = serve({ status: 200, data: { success: true, data: off } });

    await expect(createLookupsRepository().editAmenity(4, { isFilterable: true })).resolves.toEqual(
      off,
    );
    expect(requests[0]).toMatchObject({ method: 'patch', url: '/admin/amenities/4' });
    expect(bodyOf(requests[0])).toEqual({ isFilterable: true });
  });

  it('PUTs the amenities’ order as their ids, and resolves to nothing on 204', async () => {
    const requests = serve({ status: 204 });

    await expect(createLookupsRepository().orderAmenities([7, 4])).resolves.toBeUndefined();
    expect(requests[0]).toMatchObject({ method: 'put', url: '/admin/amenities/order' });
    expect(bodyOf(requests[0])).toEqual({ ids: [7, 4] });
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
