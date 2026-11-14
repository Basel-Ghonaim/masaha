import { establishSession, restoreSession } from '@shared/session';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { reportsPage } from '../../../test/dataReport';
import { stubScreenWidth } from '../../../test/screenWidth';
import { aSession } from '../../../test/fakeSession';
import { fakeTransport, ok, restoreTransport } from '../../../test/fakeTransport';
import { queryWrapper } from '../../../test/queryWrapper';
import { setSessionHint } from '../../../test/sessionHint';
import { startPreferences } from '../../../test/startPreferences';
import { warm } from '../../../test/warmLazy';
import { siteRoutes } from '../routes';

// The lazy pages the favourites' «Choose your area» crosses, loaded once before any test waits
// (src/test/warmLazy.ts).
beforeAll(
  () =>
    warm(
      () => import('../shell/SiteLayout'),
      () => import('./FavoritesPage'),
      () => import('../public/directory/DirectoryPage'),
    ),
  60_000,
);

/** An empty page of the directory, as the server answers it. */
const NO_SPACES = {
  status: 200,
  data: {
    success: true,
    data: [],
    meta: {
      currentPage: 1,
      limit: 20,
      totalPages: 0,
      totalRecords: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  },
};

/**
 * The site's routes at `path`, the user's reports and favourites answered with none, the directory
 * with no space, any other read with nothing.
 */
function renderSiteAt(path: string, favorites: unknown[] = []) {
  fakeTransport((request) =>
    request.url === '/me/reports'
      ? reportsPage([])
      : request.url === '/me/favorites'
        ? ok(favorites)
        : request.url === '/lookups'
          ? ok({
              governorates: [
                {
                  id: 2,
                  nameAr: 'غزة',
                  nameEn: 'Gaza City',
                  areas: [{ id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' }],
                },
              ],
              amenities: [],
            })
          : request.url === '/spaces'
            ? NO_SPACES
            : ok(null),
  );
  const router = createMemoryRouter([{ HydrateFallback: () => null, children: siteRoutes }], {
    initialEntries: [path],
  });
  const Wrapper = queryWrapper();
  const view = render(
    <Wrapper>
      <RouterProvider router={router} />
    </Wrapper>,
  );
  return { ...view, router };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  document.cookie = 'masaha_session=; Path=/; Max-Age=0';
});

describe('AccountLayout', () => {
  it('names its navigation «My account» and marks the page open as current; axe-clean', async () => {
    establishSession(aSession(), { source: 'signIn' });
    const { container } = renderSiteAt('/me/reports');

    const navigation = await screen.findByRole('navigation', { name: 'My account' });
    const links = within(navigation).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Favourites',
      'My reports',
      'Account settings',
    ]);
    expect(within(navigation).getByRole('link', { name: 'Account settings' })).toHaveAttribute(
      'href',
      '/me',
    );
    const current = within(navigation).getByRole('link', { name: 'My reports' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).toHaveAttribute('href', '/me/reports');
    expect(within(navigation).getByRole('link', { name: 'Favourites' })).not.toHaveAttribute(
      'aria-current',
    );
    // Selected is the spark's tint, kept under the pointer; the others hover (R1-F2 of #144).
    expect(current).toHaveClass('bg-accent', 'text-accent-foreground');
    expect(current).not.toHaveClass('bg-secondary');
    expect(current).not.toHaveClass('hover:bg-hover');
    expect(within(navigation).getByRole('link', { name: 'Favourites' })).toHaveClass(
      'hover:bg-hover',
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'My reports' }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('sends a guest to sign-in, carrying the page asked for', async () => {
    setSessionHint(false);
    await restoreSession();
    const { router } = renderSiteAt('/me/reports?status=open');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
    expect(new URLSearchParams(router.state.location.search).get('next')).toBe(
      '/me/reports?status=open',
    );
  });

  it('opens «Favourites» signed in, under the same navigation; axe-clean', async () => {
    establishSession(aSession(), { source: 'signIn' });
    const { container } = renderSiteAt('/me/favorites');

    const navigation = await screen.findByRole('navigation', { name: 'My account' });
    expect(within(navigation).getByRole('link', { name: 'Favourites' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Favourites' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('You haven’t saved any spaces yet')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('«Choose your area» from the favourites focuses the place filter from 1024 px, past the shell’s rule', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    establishSession(aSession(), { source: 'signIn' });
    const { router } = renderSiteAt('/me/favorites', [
      {
        listed: false,
        savedAt: '2026-10-27T09:00:00.000Z',
        space: { id: 9, nameEn: 'Old Hub', nameAr: null },
      },
    ]);

    // No location here (jsdom has none): near me says so, with «Choose your area».
    await user.click(await screen.findByRole('button', { name: 'Nearest to me' }));
    await user.click(await screen.findByRole('button', { name: 'Choose your area' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/spaces');
    });
    // The place filter, the filters' first control, has the focus, not the shell's main.
    await waitFor(() => {
      expect(document.getElementById('directory-filters-form')).toContainElement(
        document.activeElement as HTMLElement,
      );
    });
  });
});
