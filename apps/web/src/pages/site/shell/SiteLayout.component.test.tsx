import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../../../test/startPreferences';
import { siteRoutes } from '../routes';

/**
 * The site's routes, as the app mounts them, at the last of `history`'s paths; resolves with the
 * router once the page has loaded.
 */
async function renderSite(...history: [string, ...string[]]) {
  const router = createMemoryRouter([{ HydrateFallback: () => null, children: siteRoutes }], {
    initialEntries: history,
    initialIndex: history.length - 1,
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { level: 1 });
  return router;
}

function desktopNavigation() {
  return within(screen.getByRole('banner')).getByRole('navigation', { name: 'Main navigation' });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the site shell', () => {
  it('renders the header, the page in the main landmark, and the footer', async () => {
    await renderSite('/');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(
      within(screen.getByRole('main')).getByRole('heading', { level: 1, name: 'Home' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      'Masaha — a directory of coworking spaces in the Gaza Strip',
    );
  });

  it('links the wordmark, the pages and sign-in to their paths', async () => {
    await renderSite('/');
    const header = within(screen.getByRole('banner'));
    const navigation = within(desktopNavigation());

    expect(header.getByRole('link', { name: 'Masaha' })).toHaveAttribute('href', '/');
    expect(navigation.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(navigation.getByRole('link', { name: 'Spaces' })).toHaveAttribute('href', '/spaces');
    expect(navigation.getByRole('link', { name: 'About Masaha' })).toHaveAttribute(
      'href',
      '/about',
    );
    expect(header.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('links the footer to about and to its contact section', async () => {
    await renderSite('/');
    const footer = within(screen.getByRole('contentinfo'));

    expect(footer.getByRole('link', { name: 'About Masaha' })).toHaveAttribute('href', '/about');
    expect(footer.getByRole('link', { name: 'Contact us' })).toHaveAttribute(
      'href',
      '/about#contact',
    );
  });

  it("marks the current page's link, and only it, as the current page", async () => {
    await renderSite('/spaces');
    const navigation = within(desktopNavigation());

    expect(navigation.getByRole('link', { name: 'Spaces' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(navigation.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
    expect(navigation.getByRole('link', { name: 'About Masaha' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it("switches to the other language, and <html>'s lang and dir follow", async () => {
    const user = userEvent.setup();
    await renderSite('/');

    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'العربية' }));

    expect(document.documentElement).toHaveAttribute('lang', 'ar');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('الرئيسية');
  });

  it('sets data-theme to the opposite of the theme shown', async () => {
    const user = userEvent.setup();
    await renderSite('/');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');

    await user.click(screen.getByRole('button', { name: 'Dark theme' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    await user.click(screen.getByRole('button', { name: 'Light theme' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('opens the phone menu with the links, the language and sign-in, and closes it when a link is chosen', async () => {
    const user = userEvent.setup();
    await renderSite('/');

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const menu = within(screen.getByRole('dialog', { name: 'Menu' }));

    expect(menu.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(menu.getByRole('link', { name: 'Spaces' })).toHaveAttribute('href', '/spaces');
    expect(menu.getByRole('link', { name: 'About Masaha' })).toHaveAttribute('href', '/about');
    expect(menu.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(menu.getByRole('button', { name: 'العربية' })).toBeInTheDocument();

    await user.click(menu.getByRole('link', { name: 'Spaces' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'Spaces' })).toBeInTheDocument();
  });

  it('closes the phone menu when the history moves under it', async () => {
    const user = userEvent.setup();
    const router = await renderSite('/spaces', '/');
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument();

    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'Spaces' })).toBeInTheDocument();
  });
});
