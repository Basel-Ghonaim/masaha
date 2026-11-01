import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { noteRecoveryDone, noteSitePage, RETURN_TOAST_ID } from '@shared/routing';
import { establishSession, restoreSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { aSession } from '../../../../test/fakeSession';
import { findToast } from '../../../../test/findToast';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { setSessionHint } from '../../../../test/sessionHint';
import { startPreferences } from '../../../../test/startPreferences';
import { dropFavorite, holdFavorite } from '../intent/favoriteIntent';
import { useResumeFavorite } from './useResumeFavorite';

const lineOf = ({ method, url }: { method?: string; url?: string }) =>
  `${String(method)} ${String(url)}`;

/**
 * The resume, mounted as the site's shell mounts it — in strict mode, as the app runs, so its effect
 * runs twice on mounting — answered by `answer`.
 */
function renderResume(answer: () => FakeAnswer) {
  const requests = fakeTransport(answer);
  const client = createQueryClient();
  function Probe() {
    useResumeFavorite({ manage: vi.fn() });
    return null;
  }
  render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <Probe />
        <Toaster label="Notifications" />
      </QueryClientProvider>
    </StrictMode>,
  );
  return requests;
}

beforeEach(async () => {
  startPreferences('en');
  setSessionHint(false);
  await restoreSession();
});

afterEach(() => {
  restoreTransport();
  dropFavorite();
  document.cookie = 'masaha_session=; Path=/; Max-Age=0';
  act(() => {
    toast.dismiss();
  });
});

describe('useResumeFavorite', () => {
  it('saves a guest’s held favourite once they are signed in, once, and says so', async () => {
    holdFavorite({ spaceId: 7, name: { text: 'Masaha Hub' } });
    const requests = renderResume(() => ({ status: 204 }));
    expect(requests).toHaveLength(0);

    act(() => {
      establishSession(aSession(), { source: 'signIn' });
    });

    expect(await findToast(/^.Masaha Hub. saved to your favourites$/)).toBeInTheDocument();
    expect(requests.map(lineOf)).toEqual(['post /me/favorites/7']);
  });

  it('saves a favourite pressed as a guest in another tab once signed in here, as after a recovery', async () => {
    // The tab the guest pressed the heart in, before the reset link opened this one, wrote it.
    localStorage.setItem(
      'masaha.heldIntent',
      JSON.stringify({
        kind: 'favorite',
        spaceId: 7,
        name: { text: 'Masaha Hub' },
        path: '/spaces/masaha-hub',
        at: Date.now(),
      }),
    );
    // The reset page marked the password set: this sign-in is the recovery's round trip.
    noteRecoveryDone();
    const requests = renderResume(() => ({ status: 204 }));

    act(() => {
      establishSession(aSession(), { source: 'signIn' });
    });

    expect(await findToast(/^.Masaha Hub. saved to your favourites$/)).toBeInTheDocument();
    expect(requests.map(lineOf)).toEqual(['post /me/favorites/7']);
    expect(localStorage.getItem('masaha.heldIntent')).toBeNull();
  });

  it('saves nothing held in another tab for a sign-in here that follows no recovery', async () => {
    // Another person's tab held it on this shared computer; this sign-in is not its round trip.
    localStorage.setItem(
      'masaha.heldIntent',
      JSON.stringify({
        kind: 'favorite',
        spaceId: 7,
        name: { text: 'Masaha Hub' },
        path: '/spaces/masaha-hub',
        at: Date.now(),
      }),
    );
    const requests = renderResume(() => ({ status: 204 }));

    act(() => {
      establishSession(aSession(), { source: 'signIn' });
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(requests).toEqual([]);
    expect(localStorage.getItem('masaha.heldIntent')).toBeNull();
  });

  it('lets a guest’s held favourite go from the browser’s storage once they land on another page', () => {
    noteSitePage('/spaces/masaha-hub', true);
    holdFavorite({ spaceId: 7, name: { text: 'Masaha Hub' } });
    expect(localStorage.getItem('masaha.heldIntent')).not.toBeNull();

    noteSitePage('/about', true);

    expect(localStorage.getItem('masaha.heldIntent')).toBeNull();
  });

  it('says it in the place of the sign-in’s welcome back', async () => {
    holdFavorite({ spaceId: 7, name: { text: 'Masaha Hub' } });
    renderResume(() => ({ status: 204 }));

    act(() => {
      establishSession(aSession(), { source: 'signIn' });
      toast.success('Welcome back', { id: RETURN_TOAST_ID });
    });

    expect(await findToast(/^.Masaha Hub. saved to your favourites$/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();
    });
  });

  it('saves it once when the shell mounts again with the session, as after the sign-in page', async () => {
    holdFavorite({ spaceId: 7, name: { text: 'Masaha Hub' } });
    establishSession(aSession(), { source: 'signIn' });
    const requests = renderResume(() => ({ status: 204 }));

    expect(await findToast(/^.Masaha Hub. saved to your favourites$/)).toBeInTheDocument();
    // Strict mode ran the effect twice on mounting: the favourite was taken once.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(requests.map(lineOf)).toEqual(['post /me/favorites/7']);
  });

  it('says a failed save with «Try again», which sends it again', async () => {
    holdFavorite({ spaceId: 7, name: { text: 'Masaha Hub' } });
    let answer: FakeAnswer = { status: 500, data: { success: false, error: { type: 'server' } } };
    const requests = renderResume(() => answer);

    act(() => {
      establishSession(aSession(), { source: 'signIn' });
    });

    const line = await findToast(/^We couldn’t save .Masaha Hub. to your favourites$/);
    answer = { status: 204 };
    act(() => {
      within(line.closest('li') ?? document.body)
        .getByRole('button', { name: 'Try again' })
        .click();
    });
    await waitFor(() => {
      expect(requests.map(lineOf)).toEqual(['post /me/favorites/7', 'post /me/favorites/7']);
    });
  });

  it('saves nothing without a held favourite', async () => {
    const requests = renderResume(() => ({ status: 204 }));

    act(() => {
      establishSession(aSession(), { source: 'signIn' });
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(requests).toHaveLength(0);
    expect(screen.queryByText(/saved to your favourites/)).not.toBeInTheDocument();
  });
});
