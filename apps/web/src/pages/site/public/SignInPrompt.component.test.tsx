import { Button } from '@shared/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { createBrowserRouter, createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../../test/fakeTransport';
import { queryWrapper } from '../../../test/queryWrapper';
import { stubScreenWidth } from '../../../test/screenWidth';
import { warm } from '../../../test/warmLazy';
import { startPreferences } from '../../../test/startPreferences';
import { SignInPrompt, type SignInReason } from './SignInPrompt';

/** The prompt for `reason` on a space's page with a query, `onClose` a spy. */
function renderPrompt(reason: SignInReason | null) {
  const onClose = vi.fn();
  const router = createMemoryRouter(
    [{ path: '/spaces/:slug', element: <SignInPrompt reason={reason} onClose={onClose} /> }],
    { initialEntries: ['/spaces/masaha-hub?tab=prices'] },
  );
  const Wrapper = queryWrapper();
  const view = render(
    <Wrapper>
      <RouterProvider router={router} />
    </Wrapper>,
  );
  return { ...view, onClose };
}

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
  ]);
  const Wrapper = queryWrapper();
  render(
    <Wrapper>
      <RouterProvider router={browserRouter} />
    </Wrapper>,
  );
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

// The sign-in's forms load the first time it opens: their first transform is paid here.
beforeAll(async () => {
  await warm(() => import('../auth/in-place/InPlaceSignIn'));
}, 60_000);

beforeEach(async () => {
  // A step back the last test's dialog asked for as it unmounted lands first.
  await new Promise((resolve) => setTimeout(resolve, 50));
  startPreferences('en');
  stubScreenWidth(1280);
  // No recovery in this browser; nothing else is asked of the server here.
  fakeTransport(() => ok({ step: 'request' }));
});

afterEach(() => {
  browserRouter?.dispose();
  browserRouter = null;
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('SignInPrompt', () => {
  it('asks a guest to sign in to save a favourite, with the sign-in itself and no link away; axe-clean', async () => {
    const { baseElement } = renderPrompt('favorite');

    const dialog = within(
      await screen.findByRole('dialog', { name: 'Sign in to save spaces to your favourites' }),
    );
    expect(
      dialog.getByText('The spaces you save are in your account on any device.'),
    ).toBeInTheDocument();
    expect(await dialog.findByLabelText('Email')).toBeInTheDocument();
    expect(dialog.getByLabelText('Password')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'submit');
    expect(dialog.queryByRole('link', { name: 'Sign in' })).toBeNull();
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
    expect(await dialog.findByLabelText('Email')).toBeInTheDocument();
  });

  it('opens with the focus on its title from 768 px too, before the forms', async () => {
    renderPrompt('favorite');

    const dialog = await screen.findByRole('dialog', {
      name: 'Sign in to save spaces to your favourites',
    });
    expect(
      within(dialog).getByRole('heading', { name: 'Sign in to save spaces to your favourites' }),
    ).toHaveFocus();
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
});
