import { Button } from '@shared/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { createBrowserRouter, createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { stubScreenWidth } from '../../../test/screenWidth';
import { startPreferences } from '../../../test/startPreferences';
import { SignInPrompt, type SignInReason } from './SignInPrompt';

/** The prompt for `reason` on a space's page with a query, `onClose` a spy. */
function renderPrompt(reason: SignInReason | null) {
  const onClose = vi.fn();
  const router = createMemoryRouter(
    [{ path: '/spaces/:slug', element: <SignInPrompt reason={reason} onClose={onClose} /> }],
    { initialEntries: ['/spaces/masaha-hub?tab=prices'] },
  );
  const view = render(<RouterProvider router={router} />);
  return { ...view, onClose };
}

const NEXT = `next=${encodeURIComponent('/spaces/masaha-hub?tab=prices')}`;

/** A space's page as the site draws it: a heart that asks the guest to sign in, and the prompt. */
function GuestPage({ onClose }: { onClose: () => void }) {
  const [reason, setReason] = useState<SignInReason | null>(null);
  return (
    <main>
      <Button
        onClick={() => {
          setReason('favorite');
        }}
      >
        Save Masaha Hub
      </Button>
      <SignInPrompt
        reason={reason}
        onClose={() => {
          onClose();
          setReason(null);
        }}
      />
    </main>
  );
}

// The router on the window's own history, as the app's: Back and a link's replace act on it.
let browserRouter: ReturnType<typeof createBrowserRouter> | null = null;

/** The guest's page at 390 px in a browser router, its trigger, and the prompt's `onClose` spy. */
async function openOnPhone() {
  stubScreenWidth(390);
  window.history.replaceState(null, '', '/spaces/masaha-hub?tab=prices');
  const onClose = vi.fn();
  browserRouter = createBrowserRouter([
    { path: '/spaces/:slug', element: <GuestPage onClose={onClose} /> },
    { path: '/login', element: <p>The sign-in page</p> },
    { path: '/register', element: <p>The register page</p> },
  ]);
  render(<RouterProvider router={browserRouter} />);
  const page = screen.getByRole('main');
  const trigger = screen.getByRole('button', { name: 'Save Masaha Hub' });
  await userEvent.click(trigger);
  const dialog = await screen.findByRole('dialog', {
    name: 'Sign in to save spaces to your favourites',
  });
  return { page, trigger, dialog, onClose };
}

/** Resolves on the next move through the history, after the listeners already registered. */
function nextMove() {
  return new Promise<void>((resolve) => {
    window.addEventListener(
      'popstate',
      () => {
        resolve();
      },
      { once: true },
    );
  });
}

beforeEach(async () => {
  // A step back the last test's dialog asked for as it unmounted lands first.
  await new Promise((resolve) => setTimeout(resolve, 50));
  startPreferences('en');
  stubScreenWidth(1280);
});

afterEach(() => {
  browserRouter?.dispose();
  browserRouter = null;
  vi.unstubAllGlobals();
});

describe('SignInPrompt', () => {
  it('asks a guest to sign in to save a favourite, both links carrying the page; axe-clean', async () => {
    const { baseElement } = renderPrompt('favorite');

    const dialog = within(
      await screen.findByRole('dialog', { name: 'Sign in to save spaces to your favourites' }),
    );
    expect(
      dialog.getByText('The spaces you save are in your account on any device.'),
    ).toBeInTheDocument();
    expect(dialog.getByRole('link', { name: 'Create account' })).toHaveAttribute(
      'href',
      `/register?${NEXT}`,
    );
    expect(dialog.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', `/login?${NEXT}`);
    expect(await axe(baseElement)).toHaveNoViolations();
  });

  it('asks a guest to sign in to report, with its reason', async () => {
    renderPrompt('report');

    const dialog = within(
      await screen.findByRole('dialog', { name: 'Sign in to report information' }),
    );
    expect(
      dialog.getByText('So you’ll find the reply to your report in “My reports”.'),
    ).toBeInTheDocument();
    expect(dialog.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', `/login?${NEXT}`);
  });

  it('shows nothing with no reason, and closes with «Close»', async () => {
    const closed = renderPrompt(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    closed.unmount();

    const { onClose } = renderPrompt('report');
    await userEvent.click(await screen.findByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('fills the screen on a phone, the focus on its title; axe-clean', async () => {
    const { dialog } = await openOnPhone();

    expect(dialog).toHaveAttribute('data-form', 'panel');
    expect(
      within(dialog).getByRole('heading', { name: 'Sign in to save spaces to your favourites' }),
    ).toHaveFocus();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('closes with Back, keeping the page mounted and the focus on what opened it', async () => {
    const { page, trigger, onClose } = await openOnPhone();

    const moved = nextMove();
    window.history.back();
    await moved;

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe('/spaces/masaha-hub');
    expect(screen.getByRole('main')).toBe(page);
    expect(trigger).toHaveFocus();
  });

  it.each([
    { link: 'Sign in', page: 'The sign-in page', path: '/login' },
    { link: 'Create account', page: 'The register page', path: '/register' },
  ])(
    'leaves through «$link» in place of its entry, so Back returns to the page at once',
    async ({ link, page, path }) => {
      const { dialog } = await openOnPhone();

      await userEvent.click(within(dialog).getByRole('link', { name: link }));
      expect(await screen.findByText(page)).toBeInTheDocument();
      expect(`${window.location.pathname}${window.location.search}`).toBe(`${path}?${NEXT}`);

      const moved = nextMove();
      window.history.back();
      await moved;

      // The first step back is the page's own entry, not the prompt's left behind.
      expect(window.history.state).not.toHaveProperty('masahaOverlay');
      expect(window.location.pathname).toBe('/spaces/masaha-hub');
      expect(await screen.findByRole('button', { name: 'Save Masaha Hub' })).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    },
  );
});
