import { api, createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useDeleteSpace } from './useDeleteSpace';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const PALM = { spaceId: 9, name: { text: 'Palm Hub' } };
const FOCUS = { spaceId: 7, name: { text: 'Focus Hub' } };

/** The toast whose title reads `text`, as a reader hears it. */
const toastTitled = (text: string) =>
  screen.findByText(
    (_content, element) =>
      element?.hasAttribute('data-title') === true && element.textContent === text,
  );

/**
 * Two rows' hooks beside the admin's list, as the spaces page holds them; the server answers the
 * list with `list` and each write with `write`.
 */
function renderDelete(
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
      remove: useDeleteSpace(),
      other: useDeleteSpace(),
      list: useQuery({
        queryKey: ['admin', 'space-links', 'spaces'],
        queryFn: () => api.get('/admin/spaces'),
      }),
    }),
    { wrapper },
  );
  const writes = () => requests.filter(({ method }) => method !== 'get');
  return { ...rendered, writes, client };
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

describe('useDeleteSpace', () => {
  it('deletes the space, pending until the admin’s list has arrived again, then says so with Undo', async () => {
    const listAgain = deferred<FakeAnswer>();
    let lists = 0;
    const { result, writes } = renderDelete(
      () => ({ status: 204 }),
      () => (++lists === 1 ? ok([]) : listAgain.promise),
    );
    await waitFor(() => {
      expect(result.current.list.isSuccess).toBe(true);
    });

    act(() => {
      result.current.remove.mutate(PALM);
    });
    await waitFor(() => {
      expect(lists).toBe(2);
    });
    expect(writes()).toHaveLength(1);
    expect(result.current.remove.isPending).toBe(true);

    listAgain.resolve(ok([]));
    await waitFor(() => {
      expect(result.current.remove.isSuccess).toBe(true);
    });
    expect(await toastTitled('Palm Hub deleted')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeVisible();
  });

  it('restores the space whose Undo is pressed, even once its row has gone, and keeps no action', async () => {
    // Only Palm Hub's restore succeeds: restoring any other space fails, and says so.
    const { result, unmount, client } = renderDelete((request) =>
      request.method !== 'post' || String(request.url).includes('/9/')
        ? { status: 204 }
        : refused(404, { type: 'not_found' }),
    );
    await act(() => result.current.remove.mutateAsync(PALM));
    await act(() => result.current.other.mutateAsync(FOCUS));
    const palmToast = (await toastTitled('Palm Hub deleted')).closest('[data-sonner-toast]');
    const undo = palmToast?.querySelector('button[data-button]');

    unmount();
    (undo as HTMLButtonElement | null | undefined)?.focus();
    await userEvent.keyboard('{Enter}');

    expect(await toastTitled('Palm Hub restored')).toBeVisible();
    expect(screen.queryByText(/Couldn’t restore/)).toBeNull();
    await waitFor(() => {
      expect(client.getMutationCache().getAll()).toEqual([]);
    });
  });

  it('says the space is restored, by its name, once the admin’s list has arrived again', async () => {
    const listAgain = deferred<FakeAnswer>();
    let lists = 0;
    const { result } = renderDelete(
      () => ({ status: 204 }),
      () => (++lists === 3 ? listAgain.promise : ok([])),
    );
    await act(() => result.current.remove.mutateAsync(PALM));

    (await screen.findByRole('button', { name: 'Undo' })).focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => {
      expect(lists).toBe(3);
    });
    expect(screen.queryByText('Palm Hub restored')).toBeNull();

    listAgain.resolve(ok([]));
    expect(await toastTitled('Palm Hub restored')).toBeVisible();
  });

  it('names the space whose restore failed', async () => {
    const { result } = renderDelete((request) =>
      request.method === 'post' ? refused(404, { type: 'not_found' }) : { status: 204 },
    );
    await act(() => result.current.remove.mutateAsync(PALM));

    (await screen.findByRole('button', { name: 'Undo' })).focus();
    await userEvent.keyboard('{Enter}');

    const title = await toastTitled('Couldn’t restore Palm Hub');
    expect(title.closest('[data-sonner-toast]')).toHaveTextContent(
      'We couldn’t find what you were looking for.',
    );
  });

  it('names the space whose delete failed, with the refusal and its reference, and offers no Undo', async () => {
    const { result } = renderDelete(() => refused(500, { type: 'server' }));

    await act(async () => {
      await result.current.remove.mutateAsync(PALM).catch(() => undefined);
    });

    const title = await toastTitled('Couldn’t delete Palm Hub');
    const failure = title.closest('[data-sonner-toast]');
    expect(failure).toHaveTextContent('Something went wrong on our side. Please try again.');
    expect(failure).toHaveTextContent('Reference: ⁦req-1⁩');
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });
});
