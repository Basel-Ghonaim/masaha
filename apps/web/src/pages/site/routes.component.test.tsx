import { DocumentTitle, RecordTitleProvider } from '@shared/routing';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider, type RouteObject } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../test/fakeTransport';
import { publicSpace } from '../../test/publicSpace';
import { queryWrapper } from '../../test/queryWrapper';
import { stubScreenWidth } from '../../test/screenWidth';
import { startPreferences } from '../../test/startPreferences';
import { siteRoutes } from './routes';

/** Pages that fail, added beside the site's own, under its error boundary. */
const FAILING_PAGES: RouteObject[] = [
  {
    path: '/broken',
    Component: () => {
      throw new Error('The page broke');
    },
  },
  {
    path: '/unfetched',
    lazy: () =>
      Promise.reject(
        new TypeError('Failed to fetch dynamically imported module: http://localhost/assets/x.js'),
      ),
  },
];

/** The site's routes, with the failing pages in its boundary, at `path`. */
function renderSiteAt(path: string) {
  const [shell] = siteRoutes;
  const [boundary] = shell?.children ?? [];
  if (!shell || shell.index || !boundary?.ErrorBoundary || boundary.index) {
    throw new Error('The site has no error boundary on a layout route below its shell.');
  }
  const routes: RouteObject[] = [
    {
      ...shell,
      children: [{ ...boundary, children: [...(boundary.children ?? []), ...FAILING_PAGES] }],
    },
  ];
  const router = createMemoryRouter([{ HydrateFallback: () => null, children: routes }], {
    initialEntries: [path],
  });
  render(<RouterProvider router={router} />);
}

/** An empty page of the list, as the server answers it. */
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

/** The site's routes at `path`, the server answering the public reads with nothing listed. */
function renderPublicSite(path: string) {
  fakeTransport((request) =>
    request.url === '/lookups'
      ? ok({ governorates: [], amenities: [] })
      : request.url === '/map/spaces'
        ? ok({ pins: [], truncated: false })
        : NO_SPACES,
  );
  const router = createMemoryRouter(
    [
      {
        HydrateFallback: () => null,
        element: (
          <RecordTitleProvider>
            <DocumentTitle />
            <Outlet />
          </RecordTitleProvider>
        ),
        children: siteRoutes,
      },
    ],
    { initialEntries: [path] },
  );
  const Wrapper = queryWrapper();
  const rendered = render(
    <Wrapper>
      <RouterProvider router={router} />
    </Wrapper>,
  );
  return { ...rendered, router };
}

/** The page's title, inside the shell's main landmark. */
async function pageTitle() {
  return within(await screen.findByRole('main')).findByRole('heading', { level: 1 });
}

/** The header and the footer are there: the state is inside the shell. */
function expectTheShell() {
  expect(screen.getByRole('banner')).toBeInTheDocument();
  expect(screen.getByRole('contentinfo')).toBeInTheDocument();
}

beforeEach(() => {
  startPreferences('en');
  // React and React Router report the errors these pages throw; they are the scenario here.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the site's routes", () => {
  it('show the 404 inside the shell for an unknown path, with links home and to the directory', async () => {
    renderSiteAt('/no-such-page');

    expect(await pageTitle()).toHaveTextContent('Page not found');
    expectTheShell();
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(main.getByRole('link', { name: 'Browse spaces' })).toHaveAttribute('href', '/spaces');
  });

  it('show the general error inside the shell when a page throws', async () => {
    renderSiteAt('/broken');

    expect(await pageTitle()).toHaveTextContent('Something went wrong');
    expectTheShell();
  });

  it("show offline inside the shell when a page's code cannot be fetched, with a way home", async () => {
    renderSiteAt('/unfetched');

    expect(await pageTitle()).toHaveTextContent('No internet connection');
    expectTheShell();
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(main.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it('shows the Directory under its title', async () => {
    fakeTransport(() => ({
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
    }));
    const router = createMemoryRouter(
      [
        {
          HydrateFallback: () => null,
          element: (
            <>
              <DocumentTitle />
              <Outlet />
            </>
          ),
          children: siteRoutes,
        },
      ],
      { initialEntries: ['/spaces'] },
    );
    const Wrapper = queryWrapper();
    render(
      <Wrapper>
        <RouterProvider router={router} />
      </Wrapper>,
    );

    expect(await pageTitle()).toHaveTextContent('Workspaces');
    await waitFor(() => {
      expect(document.title).toBe('Spaces · Masaha');
    });
    expect(await screen.findByText('No spaces in the directory yet')).toBeInTheDocument();
  });

  it.each([
    [1440, 'from 768 px a breadcrumb back to the Directory with its last search'],
    [390, 'below it a back link'],
  ])('shows a space’s page titled by its name; at %i, %s', async (width) => {
    stubScreenWidth(width);
    fakeTransport((request) =>
      request.url === '/spaces'
        ? ok([], 200)
        : request.url === '/lookups'
          ? ok({ governorates: [], areas: [], amenities: [] })
          : request.url?.endsWith('/occupancy')
            ? ok({ status: null })
            : ok(publicSpace({ nameAr: null })),
    );
    const router = createMemoryRouter(
      [
        {
          HydrateFallback: () => null,
          element: (
            <RecordTitleProvider>
              <DocumentTitle />
              <Outlet />
            </RecordTitleProvider>
          ),
          children: siteRoutes,
        },
      ],
      { initialEntries: ['/spaces?q=Hub&verified=1'] },
    );
    const Wrapper = queryWrapper();
    render(
      <Wrapper>
        <RouterProvider router={router} />
      </Wrapper>,
    );
    await screen.findByRole('searchbox');
    await router.navigate('/spaces/noor-hub');

    const main = within(await screen.findByRole('main'));
    expect(await main.findByRole('heading', { level: 1, name: 'Noor Hub' })).toBeInTheDocument();
    await waitFor(() => {
      expect(document.title).toBe('Noor Hub · Masaha');
    });

    if (width >= 768) {
      const trail = main.getByRole('navigation', { name: 'Breadcrumb' });
      expect(within(trail).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
      expect(within(trail).getByRole('link', { name: 'Spaces' })).toHaveAttribute(
        'href',
        '/spaces?q=Hub&verified=1',
      );
      expect(within(trail).getByText('Noor Hub')).toHaveAttribute('aria-current', 'page');
      expect(main.queryByRole('link', { name: 'Back to spaces' })).not.toBeInTheDocument();
    } else {
      expect(main.getByRole('link', { name: 'Back to spaces' })).toHaveAttribute(
        'href',
        '/spaces?q=Hub&verified=1',
      );
      expect(main.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument();
    }
  });

  it('wires the unverified contact dialog with its none line and configured email', async () => {
    stubScreenWidth(1440);
    vi.stubEnv('VITE_CONTACT_EMAIL', '');
    fakeTransport((request) =>
      request.url === '/spaces'
        ? ok([], 200)
        : request.url === '/lookups'
          ? ok({ governorates: [], areas: [], amenities: [] })
          : request.url?.endsWith('/occupancy')
            ? ok({ status: null })
            : ok(publicSpace({ isVerified: false, contacts: [] })),
    );
    const router = createMemoryRouter(
      [
        {
          HydrateFallback: () => null,
          element: (
            <RecordTitleProvider>
              <DocumentTitle />
              <Outlet />
            </RecordTitleProvider>
          ),
          children: siteRoutes,
        },
      ],
      { initialEntries: ['/spaces/noor-hub'] },
    );
    const Wrapper = queryWrapper();
    render(
      <Wrapper>
        <RouterProvider router={router} />
      </Wrapper>,
    );
    await screen.findByRole('heading', { level: 1, name: 'Noor Hub' });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Do you run this space? Contact us' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('There’s no way to reach us set up yet.');
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Home’s search opens the Directory with what was typed; axe-clean', async () => {
    const { container, router } = renderPublicSite('/');
    expect(await pageTitle()).toHaveTextContent('Find a workspace in the Gaza Strip');
    const user = userEvent.setup();

    const search = within(screen.getByRole('search'));
    await user.type(search.getByRole('searchbox', { name: 'Search for a space' }), ' Hub & Co ');
    expect(await axe(container)).toHaveNoViolations();
    await user.click(search.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/spaces');
    });
    expect(router.state.location.search).toBe('?q=Hub%20%26%20Co');
  });

  it.each([
    ['a WhatsApp or a phone', publicSpace().contacts, true],
    ['neither', [], false],
  ] as const)(
    'reserves the footer’s room on a phone only under the contact bar: a space with %s',
    async (_, contacts, reserved) => {
      stubScreenWidth(390);
      fakeTransport((request) =>
        request.url === '/lookups'
          ? ok({ governorates: [], areas: [], amenities: [] })
          : request.url?.endsWith('/occupancy')
            ? ok({ status: null })
            : ok(publicSpace({ contacts: [...contacts] })),
      );
      const router = createMemoryRouter([{ HydrateFallback: () => null, children: siteRoutes }], {
        initialEntries: ['/spaces/noor-hub'],
      });
      const Wrapper = queryWrapper();
      render(
        <Wrapper>
          <RouterProvider router={router} />
        </Wrapper>,
      );

      await screen.findByRole('heading', { level: 1, name: 'Noor Hub' });
      const footer = screen.getByRole('contentinfo');
      if (reserved) {
        await waitFor(() => {
          expect(footer).toHaveClass('pb-24');
        });
        expect(screen.getByRole('region', { name: 'Quick contact' })).toBeInTheDocument();
      } else {
        expect(footer).not.toHaveClass('pb-24');
      }
    },
  );

  it('show offline when a page throws while the browser reports no connection', async () => {
    vi.spyOn(Navigator.prototype, 'onLine', 'get').mockReturnValue(false);
    renderSiteAt('/broken');

    expect(await pageTitle()).toHaveTextContent('No internet connection');
  });
});
