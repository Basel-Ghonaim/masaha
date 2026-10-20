import { apiClient, setupApiClient } from '@shared/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { createSpaceEditorRepository } from './spaceEditorRepository';

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

const PLACES = [
  { place: 'admin', base: '/admin/spaces' },
  { place: 'owner', base: '/manage/spaces' },
] as const;

describe('the space editor’s repository', () => {
  it('sends the owner’s editor calls to the managed routes, and the admin’s to the admin’s', async () => {
    const file = new File(['the bytes of a photo'], 'desk.jpg', { type: 'image/jpeg' });
    for (const { place, base } of PLACES) {
      const editor = createSpaceEditorRepository(place);
      const requests = serve({ status: 200, data: { success: true, data: { id: 7 } } });
      await editor.get(7);
      await editor.updateProfile(7, { nameEn: 'Focus Hub' });
      await editor.updateHours(7, { days: [null, null, null, null, null, null, null], shifts: [] });
      await editor.updatePrices(7, { prices: [] });
      await editor.updateAmenities(7, { amenityIds: [], ownAmenities: [] });
      await editor.updateContacts(7, { contacts: [] });
      await editor.confirm(7, 'hours');
      await editor.listPhotos(7);
      await editor.uploadPhoto(7, file, vi.fn());
      await editor.removePhoto(7, 3);
      await editor.orderPhotos(7, [3]);
      expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
        `get ${base}/7`,
        `patch ${base}/7`,
        `put ${base}/7/hours`,
        `put ${base}/7/prices`,
        `put ${base}/7/amenities`,
        `put ${base}/7/contacts`,
        `post ${base}/7/hours/confirm`,
        `get ${base}/7/photos`,
        `post ${base}/7/photos`,
        `delete ${base}/7/photos/3`,
        `put ${base}/7/photos/order`,
      ]);
    }
  });

  describe.each(PLACES)('for the $place', ({ place, base }) => {
    const repository = () => createSpaceEditorRepository(place);

    it('GETs one space, and resolves to it', async () => {
      const space = { id: 7, slug: 'focus-hub', nameEn: 'Focus Hub' };
      const requests = serve({ status: 200, data: { success: true, data: space } });

      await expect(repository().get(7)).resolves.toEqual(space);
      expect(requests[0]).toMatchObject({ method: 'get', url: `${base}/7` });
    });

    it('PATCHes the profile’s changes, and resolves to the space as it is then', async () => {
      const space = { id: 7, nameEn: 'Focus Hub' };
      const requests = serve({ status: 200, data: { success: true, data: space } });

      await expect(
        repository().updateProfile(7, { nameEn: 'Focus Hub', landmarkAr: null }),
      ).resolves.toEqual(space);
      expect(requests[0]).toMatchObject({ method: 'patch', url: `${base}/7` });
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

      await repository().updateHours(7, request);
      expect(requests[0]).toMatchObject({ method: 'put', url: `${base}/7/hours` });
      expect(JSON.parse(String(requests[0]?.data))).toEqual(request);
    });

    it('PUTs the prices whole', async () => {
      const requests = serve({ status: 200, data: { success: true, data: { id: 7 } } });
      const request = {
        prices: [
          {
            period: 'DAY' as const,
            audience: 'GENERAL' as const,
            shiftId: null,
            labelAr: null,
            labelEn: null,
            amountAgorot: 1500,
          },
        ],
      };

      await repository().updatePrices(7, request);
      expect(requests[0]).toMatchObject({ method: 'put', url: `${base}/7/prices` });
      expect(JSON.parse(String(requests[0]?.data))).toEqual(request);
    });

    it('PUTs the amenities group whole', async () => {
      const requests = serve({ status: 200, data: { success: true, data: { id: 7 } } });
      const request = { amenityIds: [1, 3], ownAmenities: [{ nameAr: 'غرفة صلاة', nameEn: null }] };

      await repository().updateAmenities(7, request);
      expect(requests[0]).toMatchObject({ method: 'put', url: `${base}/7/amenities` });
      expect(JSON.parse(String(requests[0]?.data))).toEqual(request);
    });

    it('PUTs the contacts whole', async () => {
      const requests = serve({ status: 200, data: { success: true, data: { id: 7 } } });
      const request = { contacts: [{ type: 'PHONE' as const, value: '+970599123456' }] };

      await repository().updateContacts(7, request);
      expect(requests[0]).toMatchObject({ method: 'put', url: `${base}/7/contacts` });
      expect(JSON.parse(String(requests[0]?.data))).toEqual(request);
    });

    it.each(['profile', 'hours', 'prices', 'amenities', 'contacts'] as const)(
      'POSTs the %s group’s confirmation, with no body',
      async (group) => {
        const requests = serve({ status: 200, data: { success: true, data: { id: 7 } } });

        await repository().confirm(7, group);
        expect(requests[0]).toMatchObject({
          method: 'post',
          url: `${base}/7/${group}/confirm`,
        });
        expect(requests[0]?.data).toBeUndefined();
      },
    );

    it('reads, uploads, removes and orders a space’s photos on the contract’s paths', async () => {
      const file = new File(['the bytes of a photo'], 'desk.jpg', { type: 'image/jpeg' });
      const photo = { id: 3, urls: { card: '/files/card.webp', page: '/files/page.webp' } };
      const progress = vi.fn();

      const listed = serve({ status: 200, data: { success: true, data: [photo] } });
      await expect(repository().listPhotos(7)).resolves.toEqual([photo]);
      expect(listed[0]).toMatchObject({ method: 'get', url: `${base}/7/photos` });

      const uploaded = serve({ status: 201, data: { success: true, data: photo } });
      await expect(repository().uploadPhoto(7, file, progress)).resolves.toEqual(photo);
      const part = uploaded[0];
      expect(part).toMatchObject({ method: 'post', url: `${base}/7/photos` });
      const body = part?.data as FormData;
      expect([...body.keys()]).toEqual(['photo']);
      expect(body.get('photo')).toBe(file);
      // The progress the transport reports reaches the caller, so a tile can show its own percentage.
      part?.onUploadProgress?.({ loaded: 1024, total: 2048, bytes: 1024, lengthComputable: true });
      expect(progress).toHaveBeenCalledWith(1024, 2048);

      const removed = serve({ status: 204 });
      await expect(repository().removePhoto(7, 3)).resolves.toBeUndefined();
      expect(removed[0]).toMatchObject({ method: 'delete', url: `${base}/7/photos/3` });

      const ordered = serve({ status: 204 });
      await expect(repository().orderPhotos(7, [4, 3])).resolves.toBeUndefined();
      expect(ordered[0]).toMatchObject({ method: 'put', url: `${base}/7/photos/order` });
      expect(JSON.parse(String(ordered[0]?.data))).toEqual({ ids: [4, 3] });
    });
  });
});
