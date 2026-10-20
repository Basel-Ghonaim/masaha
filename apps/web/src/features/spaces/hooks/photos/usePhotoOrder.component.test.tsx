import type { SpacePhoto } from '@masaha/shared/spaces';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { usePhotoOrder } from './usePhotoOrder';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const PHOTOS: SpacePhoto[] = [
  { id: 3, urls: { card: '/files/3-card.webp', page: '/files/3-page.webp' } },
  { id: 4, urls: { card: '/files/4-card.webp', page: '/files/4-page.webp' } },
  { id: 5, urls: { card: '/files/5-card.webp', page: '/files/5-page.webp' } },
];

/** The order of space 7's gallery as the admin edits it; the server answers each write with `answer`. */
function renderOrder(
  answer: (request: Request) => FakeAnswer | Promise<FakeAnswer> = () => ({ status: 204 }),
) {
  const requests = fakeTransport((request) =>
    request.method === 'get' ? ok(PHOTOS) : answer(request),
  );
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(() => usePhotoOrder('admin', 7, PHOTOS), { wrapper });
  return { ...rendered, requests, client };
}

/** Every write the gallery sent, and the order each carries. */
const ordersSent = (requests: Request[]): { ids: number[] }[] =>
  requests
    .filter(({ method }) => method === 'put')
    .map(({ data }) => JSON.parse(String(data)) as { ids: number[] });

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('usePhotoOrder', () => {
  it('sends every photo’s id in the order the admin chose, and shows the new order once the server has accepted', async () => {
    const { result, requests } = renderOrder();

    act(() => {
      result.current.moveBefore(5).run();
    });

    await waitFor(() => {
      expect(result.current.busy).toBe(false);
    });
    expect(ordersSent(requests)).toEqual([{ ids: [3, 5, 4] }]);
    expect(result.current.said).toBe('Photo 3 is now at position 2 of 3');
  });

  it('offers the arrows on the gallery’s edges as disabled, and nothing at the edge to move', () => {
    const { result } = renderOrder();

    expect(result.current.moveBefore(3).disabled).toBe(true);
    expect(result.current.moveAfter(5).disabled).toBe(true);
    expect(result.current.moveBefore(4).disabled).toBe(false);
    expect(result.current.makeCover(3)).toBeNull();
  });

  it('makes a photo the cover by sending it first', async () => {
    const { result, requests } = renderOrder();

    act(() => {
      result.current.makeCover(5)?.run();
    });

    await waitFor(() => {
      expect(result.current.busy).toBe(false);
    });
    expect(ordersSent(requests)).toEqual([{ ids: [5, 3, 4] }]);
    expect(result.current.said).toBe('Photo 3 is the cover now');
  });

  it('says the gallery was refreshed and fetches the server’s order when it refuses the move (409)', async () => {
    const { result, requests, client } = renderOrder(() => refused(409, { type: 'conflict' }));
    client.setQueryData(['admin', 'spaces', 'photos', 7], PHOTOS);

    act(() => {
      result.current.moveAfter(3).run();
    });

    await waitFor(() => {
      expect(result.current.changed).toBe(
        'The photos changed since this page was opened. We refreshed them; check the order and try again.',
      );
    });
    expect(client.getQueryState(['admin', 'spaces', 'photos', 7])?.isInvalidated).toBe(true);
    expect(result.current.refusal).toBeNull();
    expect(ordersSent(requests)).toEqual([{ ids: [4, 3, 5] }]);
    expect(result.current.refusedId).toBe(3);
  });

  it('fetches the space again when the write is refused as verified (403)', async () => {
    const { result, client } = renderOrder(() => refused(403, { type: 'forbidden' }));
    const space = client.getQueryCache();
    client.setQueryData(['admin', 'spaces', 'space', 7], { id: 7, slug: 'focus-hub' });

    act(() => {
      result.current.moveBefore(4).run();
    });

    await waitFor(() => {
      expect(result.current.refusal).toMatchObject({ type: 'forbidden', status: 403 });
    });
    expect(result.current.refusedId).toBe(4);
    // The space's own read is fetched again, so a verified space turns read-only.
    await waitFor(() => {
      expect(space.find({ queryKey: ['admin', 'spaces', 'space', 7] })?.state.isInvalidated).toBe(
        true,
      );
    });
  });
});
