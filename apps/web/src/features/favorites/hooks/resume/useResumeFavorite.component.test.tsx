import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
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
