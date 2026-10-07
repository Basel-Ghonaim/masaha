import { api, createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useSetSpaceHidden } from './useSetSpaceHidden';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const PALM = { spaceId: 9, name: { text: 'Palm Hub' } };

/** The toast whose title reads `text`, as a reader hears it. */
const toastTitled = (text: string) =>
  screen.findByText(
    (_content, element) =>
      element?.hasAttribute('data-title') === true && element.textContent === text,
  );

/**
 * The hook beside the admin's list, as the spaces page holds them; the server answers the list with
 * `list` and a write with `write`.
 */
function renderHidden(
  write: (request: Request) => FakeAnswer | Promise<FakeAnswer>,
  list: () => FakeAnswer | Promise<FakeAnswer> = () => ok([]),
) {
  const requests = fakeTransport((request) => (request.method === 'get' ? list() : write(request)));
  render(<Toaster label="Notifications" closeLabel="Close notification" />);
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(
    () => ({
      hidden: useSetSpaceHidden(),
      list: useQuery({
        queryKey: ['admin', 'space-links', 'spaces'],
        queryFn: () => api.get('/admin/spaces'),
      }),
    }),
    { wrapper },
  );
  return { ...rendered, requests, client };
}

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

describe('useSetSpaceHidden', () => {
  it('hides the space, pending until the admin’s list has arrived again, then says so by its name', async () => {
    const listAgain = deferred<FakeAnswer>();
    let lists = 0;
    const { result, requests } = renderHidden(
      () => ({ status: 204 }),
      () => (++lists === 1 ? ok([]) : listAgain.promise),
    );
    await waitFor(() => {
      expect(result.current.list.isSuccess).toBe(true);
    });

    act(() => {
      result.current.hidden.mutate({ ...PALM, isHidden: true });
    });
    await waitFor(() => {
      expect(lists).toBe(2);
    });
    expect(requests.some(({ method }) => method === 'put')).toBe(true);
    expect(result.current.hidden.isPending).toBe(true);

    listAgain.resolve(ok([]));
    await waitFor(() => {
      expect(result.current.hidden.isSuccess).toBe(true);
    });
    expect(await toastTitled('Palm Hub is hidden from the site')).toBeVisible();
  });

  it('shows it again, and says so', async () => {
    const { result } = renderHidden(() => ({ status: 204 }));

    await act(() => result.current.hidden.mutateAsync({ ...PALM, isHidden: false }));

    expect(await toastTitled('Palm Hub is visible again')).toBeVisible();
  });

  it('marks an English-only name as English in the Arabic interface’s toast', async () => {
    startPreferences('ar');
    const { result } = renderHidden(() => ({ status: 204 }));

    await act(() =>
      result.current.hidden.mutateAsync({
        spaceId: 9,
        name: { text: 'Palm Hub', lang: 'en', dir: 'ltr' },
        isHidden: true,
      }),
    );

    const title = await toastTitled('أُخفيت Palm Hub من الموقع');
    expect(within(title).getByText('Palm Hub')).toHaveAttribute('lang', 'en');
  });

  it('names the space whose hiding failed, with the refusal and its reference', async () => {
    const { result } = renderHidden(() => refused(404, { type: 'not_found' }));

    await act(async () => {
      await result.current.hidden.mutateAsync({ ...PALM, isHidden: true }).catch(() => undefined);
    });

    const title = await toastTitled('Couldn’t hide Palm Hub');
    const failure = title.closest('[data-sonner-toast]');
    expect(failure).toHaveTextContent('We couldn’t find what you were looking for.');
    expect(failure).toHaveTextContent('Reference: ⁦req-1⁩');
  });

  it('names the space whose showing failed', async () => {
    const { result } = renderHidden(() => refused(404, { type: 'not_found' }));

    await act(async () => {
      await result.current.hidden.mutateAsync({ ...PALM, isHidden: false }).catch(() => undefined);
    });

    expect(await toastTitled('Couldn’t show Palm Hub')).toBeVisible();
  });

  it('keeps no action in the cache once its row has gone', async () => {
    const { result, unmount, client } = renderHidden(() => refused(404, { type: 'not_found' }));
    await act(async () => {
      await result.current.hidden.mutateAsync({ ...PALM, isHidden: true }).catch(() => undefined);
    });

    unmount();

    await waitFor(() => {
      expect(client.getMutationCache().getAll()).toEqual([]);
    });
  });
});
