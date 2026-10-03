import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  it("show offline inside the shell when a page's code cannot be fetched", async () => {
    renderSiteAt('/unfetched');

    expect(await pageTitle()).toHaveTextContent('No internet connection');
    expectTheShell();
  });

  it('show offline when a page throws while the browser reports no connection', async () => {
    vi.spyOn(Navigator.prototype, 'onLine', 'get').mockReturnValue(false);
    renderSiteAt('/broken');

    expect(await pageTitle()).toHaveTextContent('No internet connection');
  });
});
