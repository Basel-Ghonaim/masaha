import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
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

beforeEach(() => {
  startPreferences('en');
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
});
