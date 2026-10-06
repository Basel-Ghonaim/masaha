import type { ManagedSpace, SessionSpaceLink } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { establishSession, restoreSession, type SessionUser } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aSession } from '../../test/fakeSession';
import { fakeTransport, ok, restoreTransport } from '../../test/fakeTransport';
import { stubScreenWidth } from '../../test/screenWidth';
import { setSessionHint } from '../../test/sessionHint';
import { startPreferences } from '../../test/startPreferences';
import { dashboardRoutes } from './routes';

const FOCUS: ManagedSpace = {
  spaceId: 7,
  role: 'OWNER',
  slug: 'focus-hub',
  nameAr: 'فوكس هب',
  nameEn: 'Focus Hub',
  area: { nameAr: 'النصر', nameEn: 'An-Nasr' },
};

const OWNER_PAGES = [
  'Overview',
  'Front desk',
  'Customers',
  'Payments',
  'Finance & reports',
  'Packages & prices',
  'Space profile',
  'Announcements',
  'Data reports',
  'Staff',
  'Settings',
];
const RECEPTION_PAGES = ['Front desk', 'Customers', 'My payments today', 'Announcements'];
const ADMIN_PAGES = [
  'Overview',
  'Spaces',
  'Space owners',
  'Data reports',
  'Users',
  'Lookups',
  'Audit log',
  'Settings',
];

/** Signs in a user (id 1) with `fields`; their spaces are answered from their links. */
function signIn(fields: Partial<SessionUser>) {
  const { user } = aSession(fields);
  establishSession({ user, accessToken: 'token-1' }, { source: 'signIn' });
  fakeTransport(() =>
    ok(
      user.spaces.map((link: SessionSpaceLink) => ({
        ...FOCUS,
        ...link,
        nameEn: link.spaceId === FOCUS.spaceId ? FOCUS.nameEn : 'Nook',
      })),
    ),
  );
}

const asOwner = () => {
  signIn({ role: 'OWNER', spaces: [{ spaceId: 7, role: 'OWNER' }] });
};
const asReception = () => {
  signIn({ spaces: [{ spaceId: 7, role: 'RECEPTION' }] });
};
/** The owner of Focus Hub (7), who is also reception at Nook (3). */
const asOwnerAndReception = () => {
  signIn({
    role: 'OWNER',
    spaces: [
      { spaceId: 7, role: 'OWNER' },
      { spaceId: 3, role: 'RECEPTION' },
    ],
  });
};

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) =>
  name.replace(/[\u2066-\u2069]/g, '') === expected;

/** The dashboard's real routes, beside home and sign-in, opened at `path`. */
function renderDashboard(path: string) {
  const router = createMemoryRouter(
    [
      { HydrateFallback: () => null, children: dashboardRoutes },
      { path: '/', element: <p>The home page</p> },
      { path: '/login', element: <p>The sign-in page</p> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

/** The names of the pages a sidebar lists, in order: its first list (the foot is another). */
async function pagesIn(navigation: string) {
  const nav = await screen.findByRole('navigation', { name: navigation });
  const [pages] = within(nav).getAllByRole('list');
  return pages
    ? within(pages)
        .getAllByRole('link')
        .map((link) => link.textContent)
    : [];
}

/** The page's title, in the top bar. */
async function topBarTitle() {
  return within(await screen.findByRole('banner')).findByRole('heading', { level: 1 });
}

/** The heading named `name` in the main landmark, where a status state shows. */
async function stateInMain(name: string) {
  return within(await screen.findByRole('main')).findByRole('heading', { name });
}

beforeEach(() => {
  startPreferences('en');
  stubScreenWidth(1280);
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("the dashboard's navigation", () => {
  it('lists the owner’s eleven pages, the overview marked as the page shown', async () => {
    asOwner();
    renderDashboard('/dashboard/spaces/7');

    expect(await pagesIn('Space dashboard')).toEqual(OWNER_PAGES);
    expect(
      within(screen.getByRole('navigation', { name: 'Space dashboard' })).getByRole('link', {
        name: 'Overview',
      }),
    ).toHaveAttribute('aria-current', 'page');
    expect(await topBarTitle()).toHaveTextContent('Overview');
  });

  it('lists reception’s four pages at its space, the front desk among them', async () => {
    asReception();
    renderDashboard('/dashboard/spaces/7/desk');

    expect(await pagesIn('Space dashboard')).toEqual(RECEPTION_PAGES);
    expect(await topBarTitle()).toHaveTextContent('Front desk');
  });

  it('lists the admin’s eight pages under the platform’s own header', async () => {
    signIn({ role: 'ADMIN' });
    renderDashboard('/dashboard/admin');

    expect(await pagesIn('Platform admin')).toEqual(ADMIN_PAGES);
    expect(screen.getByText('Masaha')).toBeInTheDocument();
    expect(await topBarTitle()).toHaveTextContent('Overview');
  });

  it('shows the admin the lookups page: its title in the top bar, and the governorates', async () => {
    signIn({ role: 'ADMIN' });
    fakeTransport(({ url }) =>
      ok(
        url === '/admin/governorates'
          ? [{ id: 2, nameAr: 'محافظة غزة', nameEn: 'Gaza City', isActive: true, areas: [] }]
          : [],
      ),
    );
    renderDashboard('/dashboard/admin/lookups');

    expect(await topBarTitle()).toHaveTextContent('Lookups');
    expect(await screen.findByRole('heading', { name: 'Gaza City', level: 2 })).toBeInTheDocument();
  });

  it('links each page below its branch', async () => {
    asOwner();
    renderDashboard('/dashboard/spaces/7');
    const nav = within(await screen.findByRole('navigation', { name: 'Space dashboard' }));

    expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      '/dashboard/spaces/7',
    );
    expect(nav.getByRole('link', { name: 'Data reports' })).toHaveAttribute(
      'href',
      '/dashboard/spaces/7/reports',
    );
  });

  it('links the space’s public page, by its slug, in a new tab', async () => {
    asOwner();
    renderDashboard('/dashboard/spaces/7');

    const link = await screen.findByRole('link', { name: 'View public page' });
    expect(link).toHaveAttribute('href', '/spaces/focus-hub');
    expect(link).toHaveAttribute('target', '_blank');
  });
});

describe("the dashboard's guards", () => {
  it('refuses reception the owner’s payments with the 403 inside the shell', async () => {
    asReception();
    renderDashboard('/dashboard/spaces/7/payments');

    expect(await stateInMain('You don’t have access to this page')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Space dashboard' })).toBeInTheDocument();
  });

  it('shows reception its own payments today', async () => {
    asReception();
    renderDashboard('/dashboard/spaces/7/my-payments');

    expect(await topBarTitle()).toHaveTextContent('My payments today');
  });

  it('refuses the owner reception’s payments today with the 403', async () => {
    asOwner();
    renderDashboard('/dashboard/spaces/7/my-payments');

    expect(await stateInMain('You don’t have access to this page')).toBeInTheDocument();
  });

  it('shows the 404 inside the shell, with no pages listed, for a space id that is not one', async () => {
    asOwner();
    renderDashboard('/dashboard/spaces/abc/customers');

    expect(await stateInMain('Page not found')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Space dashboard' });
    expect(within(nav).queryByRole('link', { name: 'Customers' })).not.toBeInTheDocument();
  });

  it('shows the 403 inside the shell for a space the user holds no link to', async () => {
    asOwner();
    renderDashboard('/dashboard/spaces/8/customers');

    expect(await stateInMain('You don’t have access to this page')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Space dashboard' })).toBeInTheDocument();
  });

  it('shows the 404 inside the shell for a page the space branch does not have', async () => {
    asOwner();
    renderDashboard('/dashboard/spaces/7/no-such-page');

    expect(await stateInMain('Page not found')).toBeInTheDocument();
  });

  it('refuses a non-admin the platform’s pages with the 403, without the admin’s navigation', async () => {
    asOwner();
    renderDashboard('/dashboard/admin/users');

    expect(
      await screen.findByRole('heading', { name: 'You don’t have access to this page' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Platform admin' })).not.toBeInTheDocument();
  });

  it('sends a guest to sign-in, carrying the space page asked for', async () => {
    setSessionHint(false);
    await restoreSession();
    const router = renderDashboard('/dashboard/spaces/7/desk');

    expect(await screen.findByText('The sign-in page')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?next=%2Fdashboard%2Fspaces%2F7%2Fdesk');
  });
});

describe('/dashboard', () => {
  it.each([
    ['the admin', { role: 'ADMIN' as const }, '/dashboard/admin'],
    [
      'an owner, to the overview',
      { role: 'OWNER' as const, spaces: [{ spaceId: 7, role: 'OWNER' as const }] },
      '/dashboard/spaces/7',
    ],
    [
      'reception, to the front desk',
      { spaces: [{ spaceId: 7, role: 'RECEPTION' as const }] },
      '/dashboard/spaces/7/desk',
    ],
    ['a user with no role and no space, home', {}, '/'],
  ])('sends %s', async (_, fields, landing) => {
    signIn(fields);
    const router = renderDashboard('/dashboard');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(landing);
    });
  });

  it('sends a user back to the space they entered last', async () => {
    signIn({
      role: 'OWNER',
      spaces: [
        { spaceId: 7, role: 'OWNER' },
        { spaceId: 3, role: 'RECEPTION' },
      ],
    });
    const visit = renderDashboard('/dashboard/spaces/3/desk');
    expect(await topBarTitle()).toHaveTextContent('Front desk');
    visit.dispose();

    const router = renderDashboard('/dashboard');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/dashboard/spaces/3/desk');
    });
  });
});

describe('entering a space', () => {
  it('remembers it for the user', async () => {
    asOwner();
    renderDashboard('/dashboard/spaces/7/customers');

    await topBarTitle();
    expect(window.localStorage.getItem('masaha.lastSpace.1')).toBe('7');
  });

  it('moves to another space from the switcher, listing its role’s pages and remembering it', async () => {
    const user = userEvent.setup();
    asOwnerAndReception();
    const router = renderDashboard('/dashboard/spaces/7');
    expect(await pagesIn('Space dashboard')).toEqual(OWNER_PAGES);

    await user.click(await screen.findByRole('button', { name: heard('Switch space: Focus Hub') }));
    await user.click(
      within(await screen.findByRole('menu')).getByRole('menuitem', { name: /Nook/ }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/dashboard/spaces/3/desk');
    });
    await waitFor(async () => {
      expect(await pagesIn('Space dashboard')).toEqual(RECEPTION_PAGES);
    });
    expect(window.localStorage.getItem('masaha.lastSpace.1')).toBe('3');
  });

  it('remembers no space the user holds no link to', async () => {
    asOwner();
    renderDashboard('/dashboard/spaces/8');

    await screen.findByRole('heading', { name: 'You don’t have access to this page' });
    expect(window.localStorage.getItem('masaha.lastSpace.1')).toBeNull();
  });
});

describe('the dashboard on a phone', () => {
  it('closes the drawer when another space is chosen in it', async () => {
    const user = userEvent.setup();
    stubScreenWidth(390);
    asOwnerAndReception();
    renderDashboard('/dashboard/spaces/7');

    await user.click(await screen.findByRole('button', { name: 'Menu' }));
    const drawer = within(await screen.findByRole('dialog', { name: 'Space dashboard' }));
    await user.click(await drawer.findByRole('button', { name: heard('Switch space: Focus Hub') }));
    await user.click(
      within(await screen.findByRole('menu')).getByRole('menuitem', { name: /Nook/ }),
    );

    expect(await topBarTitle()).toHaveTextContent('Front desk');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('opens the drawer with the pages and the language, and closes it when a page is chosen', async () => {
    const user = userEvent.setup();
    stubScreenWidth(390);
    asOwner();
    renderDashboard('/dashboard/spaces/7');

    await user.click(await screen.findByRole('button', { name: 'Menu' }));

    const drawer = within(await screen.findByRole('dialog', { name: 'Space dashboard' }));
    expect(drawer.getByRole('button', { name: 'العربية' })).toBeInTheDocument();
    await user.click(drawer.getByRole('link', { name: 'Customers' }));

    expect(await topBarTitle()).toHaveTextContent('Customers');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
