import { createQueryClient } from '@shared/api';
import { restoreSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeGeolocation } from '../../../../test/fakeGeolocation';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { setSessionHint } from '../../../../test/sessionHint';
import { startPreferences } from '../../../../test/startPreferences';
import { siteRoutes } from '../../routes';

/** An empty page of the list, as the server gives it. */
const EMPTY_PAGE = {
  status: 200,
  data: {
    success: true,
    data: [],
    meta: {
      currentPage: 1,
      limit: 6,
      totalPages: 0,
      totalRecords: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  },
};

/** Home in the site's shell, its reads answered empty; near me's ask refused by the device. */
async function renderHome() {
  fakeTransport((request) =>
    request.url === '/lookups'
      ? ok({ governorates: [], amenities: [] })
      : request.url === '/map/spaces'
        ? ok({ pins: [], truncated: false })
        : EMPTY_PAGE,
  );
  const device = fakeGeolocation();
  const router = createMemoryRouter([{ HydrateFallback: () => null, children: siteRoutes }], {
    initialEntries: ['/'],
  });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Nearest to me' }));
  device.fail();
  return { router, user };
}

// The shell and the pages load lazily; their first transform is the file's start-up, not a test's.
beforeAll(async () => {
  await Promise.all([
    import('../../shell/SiteLayout'),
    import('./HomePage'),
    import('../directory/DirectoryPage'),
  ]);
});

beforeEach(async () => {
  startPreferences('en');
  setSessionHint(false);
  await restoreSession();
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Home’s near me', () => {
  it('«Choose your area» scrolls to the areas and focuses their heading', async () => {
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView');
    const { user } = await renderHome();

    await user.click(await screen.findByRole('button', { name: 'Choose your area' }));

    const heading = screen.getByRole('heading', { level: 2, name: 'Browse by area' });
    expect(heading).toHaveFocus();
    expect(scrolled.mock.contexts).toContain(heading);
  });

  it('«Set my location on the map» starts the pick on the Directory’s map', async () => {
    const { router, user } = await renderHome();

    await user.click(await screen.findByRole('button', { name: 'Set my location on the map' }));

    await waitFor(() => {
      expect(`${router.state.location.pathname}${router.state.location.search}`).toBe(
        '/spaces?view=map',
      );
    });
    // The map's view, picking: its search shown, near me's button hidden until the point is set.
    expect(
      await screen.findByRole('searchbox', { name: 'Search for a space' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Nearest to me' })).not.toBeInTheDocument();
    });
  });
});
