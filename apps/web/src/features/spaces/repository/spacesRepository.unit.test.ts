import type { CreateSpaceRequest } from '@masaha/shared/spaces';
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
  it('POSTs a new space’s profile to /admin/spaces, and resolves to the space created', async () => {
    const request: CreateSpaceRequest = {
      nameEn: 'Focus Hub',
      areaId: 11,
      addressAr: 'شارع النصر',
      location: { lat: 31.52, lng: 34.45 },
    };
    const created = { id: 7, slug: 'focus-hub', ...request };
    const requests = serve({ status: 201, data: { success: true, data: created } });

    await expect(createSpacesRepository().create(request)).resolves.toEqual(created);
    expect(requests[0]).toMatchObject({ method: 'post', url: '/admin/spaces' });
    expect(JSON.parse(String(requests[0]?.data))).toEqual(request);
  });

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

  it('GETs one space, and resolves to it', async () => {
    const space = { id: 7, slug: 'focus-hub', nameEn: 'Focus Hub' };
    const requests = serve({ status: 200, data: { success: true, data: space } });

    await expect(createSpacesRepository().get(7)).resolves.toEqual(space);
    expect(requests[0]).toMatchObject({ method: 'get', url: '/admin/spaces/7' });
  });

  it('PATCHes the profile’s changes, and resolves to the space as it is then', async () => {
    const space = { id: 7, nameEn: 'Focus Hub' };
    const requests = serve({ status: 200, data: { success: true, data: space } });

    await expect(
      createSpacesRepository().updateProfile(7, { nameEn: 'Focus Hub', landmarkAr: null }),
    ).resolves.toEqual(space);
    expect(requests[0]).toMatchObject({ method: 'patch', url: '/admin/spaces/7' });
    expect(JSON.parse(String(requests[0]?.data))).toEqual({
      nameEn: 'Focus Hub',
      landmarkAr: null,
    });
  });

  it('PUTs the hours with the shifts whole', async () => {
    const requests = serve({ status: 200, data: { success: true, data: { id: 7 } } });
    const request = {
      days: [null, null, null, null, null, null, { opensMinute: 540, closesMinute: 1440 }],
      shifts: [
        { id: 4, nameAr: 'صباحية', nameEn: null, startsMinute: 540, endsMinute: 780 },
        { nameAr: 'ليلية', nameEn: 'Night', startsMinute: 1200, endsMinute: 1410 },
      ],
    };

    await createSpacesRepository().updateHours(7, request);
    expect(requests[0]).toMatchObject({ method: 'put', url: '/admin/spaces/7/hours' });
    expect(JSON.parse(String(requests[0]?.data))).toEqual(request);
  });

  it('PUTs the amenities group whole', async () => {
    const requests = serve({ status: 200, data: { success: true, data: { id: 7 } } });
    const request = { amenityIds: [1, 3], ownAmenities: [{ nameAr: 'غرفة صلاة', nameEn: null }] };

    await createSpacesRepository().updateAmenities(7, request);
    expect(requests[0]).toMatchObject({ method: 'put', url: '/admin/spaces/7/amenities' });
    expect(JSON.parse(String(requests[0]?.data))).toEqual(request);
  });

  it('PUTs the contacts whole', async () => {
    const requests = serve({ status: 200, data: { success: true, data: { id: 7 } } });
    const request = { contacts: [{ type: 'PHONE' as const, value: '+970599123456' }] };

    await createSpacesRepository().updateContacts(7, request);
    expect(requests[0]).toMatchObject({ method: 'put', url: '/admin/spaces/7/contacts' });
    expect(JSON.parse(String(requests[0]?.data))).toEqual(request);
  });

  it.each(['profile', 'hours', 'amenities', 'contacts'] as const)(
    'POSTs the %s group’s confirmation, with no body',
    async (group) => {
      const requests = serve({ status: 200, data: { success: true, data: { id: 7 } } });

      await createSpacesRepository().confirm(7, group);
      expect(requests[0]).toMatchObject({
        method: 'post',
        url: `/admin/spaces/7/${group}/confirm`,
      });
      expect(requests[0]?.data).toBeUndefined();
    },
  );

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
