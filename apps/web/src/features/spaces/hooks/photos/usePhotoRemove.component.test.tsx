import type { SpacePhoto } from '@masaha/shared/spaces';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { startPreferences } from '../../../../test/startPreferences';
import type { PhotoTileView } from '../../types/PhotoTileView';
import { usePhotoRemove } from './usePhotoRemove';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const PHOTOS: SpacePhoto[] = [
  { id: 3, urls: { card: '/files/3-card.webp', page: '/files/3-page.webp' } },
  { id: 4, urls: { card: '/files/4-card.webp', page: '/files/4-page.webp' } },
];

/** The tile of the photo at `position`, as the gallery builds it for a component to draw. */
const tileOf = (position: number, id: number): PhotoTileView => ({
  id,
  key: `photo-${String(id)}`,
  position,
  label: `Photo ${String(position)}`,
  cover: position === 1,
  image: { src: `/files/${String(id)}-card.webp` },
  failure: null,
  actions: null,
});

/** The removal hook of space 7's gallery; the server answers each write with `answer`. */
function renderRemove(
  answer: (request: Request) => FakeAnswer | Promise<FakeAnswer> = () => ({ status: 204 }),
) {
  const requests = fakeTransport((request) =>
    request.method === 'get' ? ok(PHOTOS) : answer(request),
  );
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(() => usePhotoRemove('admin', 7), { wrapper });
  render(<Toaster label="Notifications" closeLabel="Close notification" />);
  return { ...rendered, requests, client };
}

const writes = (requests: Request[]) => requests.filter(({ method }) => method !== 'get');

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.unstubAllGlobals();
});

describe('usePhotoRemove', () => {
  it('asks before it removes a photo, and says what it removed', async () => {
    const { result, requests } = renderRemove();

    act(() => {
      result.current.ask(tileOf(2, 4));
    });

    expect(result.current.target).toMatchObject({ position: 2, key: 'photo-4' });
    expect(writes(requests)).toEqual([]);

    act(() => {
      result.current.confirm();
    });

    await waitFor(() => {
      expect(result.current.target).toBeNull();
    });
    expect(writes(requests).map(({ method, url }) => ({ method, url }))).toEqual([
      { method: 'delete', url: '/admin/spaces/7/photos/4' },
    ]);
    expect(await findToast('Photo 2 deleted')).toBeVisible();
  });

  it('removes nothing while the dialog is open, and a cancelled ask writes nothing', () => {
    const { result, requests } = renderRemove();

    act(() => {
      result.current.ask(tileOf(1, 3));
    });
    act(() => {
      result.current.cancel();
    });

    expect(result.current.target).toBeNull();
    expect(writes(requests)).toEqual([]);
  });

  it('keeps the dialog open and says why when the write is refused (403)', async () => {
    const { result } = renderRemove(() => refused(403, { type: 'forbidden' }));

    act(() => {
      result.current.ask(tileOf(2, 4));
    });
    act(() => {
      result.current.confirm();
    });

    await waitFor(() => {
      expect(result.current.refusal).toMatchObject({ type: 'forbidden', status: 403 });
    });
    expect(result.current.target).toMatchObject({ key: 'photo-4' });
  });

  it('fetches the space again when the removal is refused as deleted (404)', async () => {
    const { result, client } = renderRemove(() => refused(404, { type: 'not_found' }));
    const space = client.getQueryCache();
    client.setQueryData(['admin', 'spaces', 'space', 7], { id: 7, slug: 'focus-hub' });
    client.setQueryData(['admin', 'spaces', 'photos', 7], PHOTOS);

    act(() => {
      result.current.ask(tileOf(2, 4));
    });
    act(() => {
      result.current.confirm();
    });

    await waitFor(() => {
      expect(space.find({ queryKey: ['admin', 'spaces', 'space', 7] })?.state.isInvalidated).toBe(
        true,
      );
    });
    // The gallery is fetched again too, so what is drawn is what the server has.
    expect(client.getQueryState(['admin', 'spaces', 'photos', 7])?.isInvalidated).toBe(true);
  });

  it('forgets a failed removal when the dialog is asked about another photo', async () => {
    const { result } = renderRemove(() => refused(500, { type: 'server' }));

    act(() => {
      result.current.ask(tileOf(2, 4));
    });
    act(() => {
      result.current.confirm();
    });
    await waitFor(() => {
      expect(result.current.refusal).toMatchObject({ type: 'server' });
    });
    act(() => {
      result.current.cancel();
    });
    act(() => {
      result.current.ask(tileOf(1, 3));
    });

    expect(result.current.refusal).toBeNull();
  });
});
