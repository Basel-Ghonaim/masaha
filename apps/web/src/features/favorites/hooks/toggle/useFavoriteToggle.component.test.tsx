import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { establishSession, restoreSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { aSession, deferred } from '../../../../test/fakeSession';
import { findToast } from '../../../../test/findToast';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { setSessionHint } from '../../../../test/sessionHint';
import { startPreferences } from '../../../../test/startPreferences';
import { dropFavorite, takeFavorite } from '../intent/favoriteIntent';
import { useFavoriteToggle } from './useFavoriteToggle';

const SPACE = { id: 7, name: { text: 'Masaha Hub' } };

/** A reader's text, with the Unicode isolates around inserted values removed. */
const seen = (text: string | null | undefined) => (text ?? '').replace(/[⁦-⁩]/g, '');

const lineOf = ({ method, url }: { method?: string; url?: string }) =>
  `${String(method)} ${String(url)}`;

/** The heart of «Masaha Hub», `saved` as given, answered by `answer`; `result.current` is its view. */
function renderHeart(answer: () => FakeAnswer | Promise<FakeAnswer>, saved = false) {
  const requests = fakeTransport(answer);
  const client = createQueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const signIn = vi.fn<(reason: 'favorite', cancel: () => void) => void>();
  const manage = vi.fn();
  const result = { current: undefined as unknown as ReturnType<typeof useFavoriteToggle> };
  function Probe({ isSaved }: { isSaved: boolean }) {
    result.current = useFavoriteToggle({ space: SPACE, saved: isSaved, signIn, manage });
    return null;
  }
  const view = render(
    <QueryClientProvider client={client}>
      <Probe isSaved={saved} />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  const rerender = (isSaved: boolean) => {
    view.rerender(
      <QueryClientProvider client={client}>
        <Probe isSaved={isSaved} />
        <Toaster label="Notifications" />
      </QueryClientProvider>,
    );
  };
  return { result, requests, invalidate, signIn, manage, rerender };
}

/** The toast holding `text`, as a region to search. */
async function toastWith(text: string | RegExp) {
  const line = await findToast(text);
  return within(line.closest('li') ?? document.body);
}

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession(), { source: 'signIn' });
});

afterEach(() => {
  restoreTransport();
  dropFavorite();
  document.cookie = 'masaha_session=; Path=/; Max-Age=0';
  act(() => {
    toast.dismiss();
  });
});

describe('useFavoriteToggle', () => {
  it('is pressed at once, held until the favourites are read again, and keeps its one name', async () => {
    const answer = deferred<FakeAnswer>();
    const { result, requests, invalidate, rerender } = renderHeart(() => answer.promise);

    expect(result.current.pressed).toBe(false);
    expect(seen(result.current.label)).toBe('Save Masaha Hub to favourites');
    act(() => {
      result.current.run();
    });

    expect(result.current.pressed).toBe(true);
    // A toggle keeps its name; `aria-pressed` says the state (WAI-ARIA's button pattern).
    expect(seen(result.current.label)).toBe('Save Masaha Hub to favourites');
    await waitFor(() => {
      expect(requests.map(lineOf)).toEqual(['post /me/favorites/7']);
    });

    await act(async () => {
      answer.resolve({ status: 204 });
      await answer.promise;
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] });
    });
    // The favourites, read again, say it is saved: the directory's state is the truth.
    rerender(true);
    await waitFor(() => {
      expect(result.current.busy).toBe(false);
    });
    expect(result.current.pressed).toBe(true);
  });

  it('says the space was added with «Undo», which sends the removal once', async () => {
    const { result, requests } = renderHeart(() => ({ status: 204 }));

    act(() => {
      result.current.run();
    });

    const added = await toastWith('Added to favourites');
    expect(added.getByText('Masaha Hub')).toBeInTheDocument();
    act(() => {
      added.getByRole('button', { name: 'Undo' }).click();
    });
    await waitFor(() => {
      expect(requests.map(lineOf)).toEqual(['post /me/favorites/7', 'delete /me/favorites/7']);
    });
  });

  it('removes a saved space and says so, with «Undo»', async () => {
    const { result, requests } = renderHeart(() => ({ status: 204 }), true);

    act(() => {
      result.current.run();
    });

    expect(result.current.pressed).toBe(false);
    const removed = await toastWith('Removed from favourites');
    expect(removed.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(requests.map(lineOf)).toEqual(['delete /me/favorites/7']);
  });

  it('puts the heart back when the save fails, says so with «Try again», and re-sends nothing by itself', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { result, requests } = renderHeart(() => ({ failure: 'ERR_NETWORK' }));

      act(() => {
        result.current.run();
      });
      const failed = await toastWith(/^We couldn’t save .Masaha Hub. to your favourites$/);
      expect(result.current.pressed).toBe(false);
      expect(requests).toHaveLength(1);

      act(() => {
        failed.getByRole('button', { name: 'Try again' }).click();
      });
      await waitFor(() => {
        expect(requests.map(lineOf)).toEqual(['post /me/favorites/7', 'post /me/favorites/7']);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(requests).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('words a full list with «Manage favourites», and a space gone from the directory', async () => {
    let answer = refused(409, { type: 'conflict', code: 'FAVORITES_LIMIT_REACHED' });
    const { result, manage } = renderHeart(() => answer);

    act(() => {
      result.current.run();
    });
    const full = await toastWith('Your favourites are full; remove a space first.');
    act(() => {
      full.getByRole('button', { name: 'Manage favourites' }).click();
    });
    expect(manage).toHaveBeenCalledTimes(1);
    expect(result.current.pressed).toBe(false);

    answer = refused(404, { type: 'not_found' });
    act(() => {
      result.current.run();
    });
    expect(await findToast('This space is no longer in the directory.')).toBeInTheDocument();
    expect(result.current.pressed).toBe(false);
  });

  it('holds a guest’s press, asks the sign-in for a favourite, and sends nothing', async () => {
    setSessionHint(false);
    await restoreSession();
    const { result, requests, signIn } = renderHeart(() => ({ status: 204 }));

    act(() => {
      result.current.run();
    });

    expect(signIn).toHaveBeenCalledWith('favorite', expect.any(Function));
    expect(result.current.pressed).toBe(false);
    expect(requests).toHaveLength(0);
    expect(takeFavorite()).toEqual({ spaceId: 7, name: { text: 'Masaha Hub' } });
  });
});
