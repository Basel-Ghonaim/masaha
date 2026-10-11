import type { PaginationMeta } from '@masaha/shared/core';
import type { LookupsCatalogue } from '@masaha/shared/lookups';
import type { AdminSpaceRow, ManagedSpace, SessionSpaceLink } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { establishSession, restoreSession, type SessionUser } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { aSession } from '../../test/fakeSession';
import type { FakeAnswer } from '../../test/fakeAdapter';
import { fakeTransport, ok, refused, restoreTransport } from '../../test/fakeTransport';
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

describe("the admin's lookups page", () => {
  /** The admin, on the lookups page at `search`, with a governorate and an amenity to show. */
  function openLookups(search: string) {
    signIn({ role: 'ADMIN' });
    fakeTransport(({ url }) =>
      ok(
        url === '/admin/governorates'
          ? [{ id: 2, nameAr: 'محافظة غزة', nameEn: 'Gaza City', isActive: true, areas: [] }]
          : url === '/admin/amenities'
            ? [
                {
                  id: 4,
                  key: 'internet',
                  nameAr: 'إنترنت',
                  nameEn: 'Internet',
                  icon: 'wifi',
                  isActive: true,
                  isFilterable: false,
                },
              ]
            : [],
      ),
    );
    return renderDashboard(`/dashboard/admin/lookups${search}`);
  }

  it('opens the amenities’ tab from the address', async () => {
    openLookups('?tab=amenities');

    expect(await screen.findByRole('tab', { name: 'Amenities' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const panel = screen.getByRole('tabpanel', { name: 'Amenities' });
    expect(await within(panel).findByText('Internet')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Gaza City' })).not.toBeInTheDocument();
  });

  it.each(['', '?tab=elsewhere'])(
    'opens the governorates’ tab when the address names no tab it has (%s)',
    async (search) => {
      openLookups(search);

      expect(await screen.findByRole('tab', { name: 'Governorates and areas' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      const panel = screen.getByRole('tabpanel', { name: 'Governorates and areas' });
      expect(
        await within(panel).findByRole('heading', { name: 'Gaza City', level: 2 }),
      ).toBeInTheDocument();
    },
  );

  it('keeps the tab chosen in the address, and none for the first tab', async () => {
    const router = openLookups('');

    await userEvent.click(await screen.findByRole('tab', { name: 'Amenities' }));

    expect(router.state.location.search).toBe('?tab=amenities');
    expect(
      await within(screen.getByRole('tabpanel', { name: 'Amenities' })).findByText('Internet'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Governorates and areas' }));

    expect(router.state.location.search).toBe('');
  });

  it('names its tabs after the page, with its hint under them', async () => {
    openLookups('');

    expect(await screen.findByRole('tablist', { name: 'Lookups' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Hidden: not shown in filters and forms. Spaces already using it stay as they are. The order here is the display order.',
      ),
    ).toBeInTheDocument();
  });
});

describe("the admin's add-space page", () => {
  const CATALOGUE: LookupsCatalogue = {
    governorates: [
      {
        id: 1,
        nameAr: 'غزة',
        nameEn: 'Gaza',
        areas: [{ id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' }],
      },
    ],
    amenities: [],
  };

  // The add page and the list it returns to load lazily, and their first transform in this lane,
  // cold, takes seconds even alone: done before the test, so its waits measure the routes, not Vite
  // (finding 28).
  beforeAll(async () => {
    await Promise.all([import('./admin/AddSpacePage'), import('./admin/SpacesPage')]);
  });

  /** Pastes `text` into the field labelled `label`: typing key by key is the form's own tests'. */
  async function fill(user: ReturnType<typeof userEvent.setup>, label: string, text: string) {
    await user.click(screen.getByLabelText(label));
    await user.paste(text);
  }

  it('offers the public catalogue’s areas, and returns to the list once the space is added', async () => {
    const user = userEvent.setup();
    signIn({ role: 'ADMIN' });
    const requests = fakeTransport((request) =>
      request.method === 'post'
        ? ok({ id: 7, slug: 'focus-hub', nameEn: 'Focus Hub', nameAr: null }, 201)
        : request.url === '/lookups'
          ? ok(CATALOGUE)
          : ok([]),
    );
    const router = renderDashboard('/dashboard/admin/spaces/new');

    await screen.findByLabelText('Name in English');
    await fill(user, 'Name in English', 'Focus Hub');
    await user.click(screen.getByRole('combobox', { name: 'Area' }));
    await user.click(await screen.findByRole('option', { name: 'Al-Rimal' }));
    await fill(user, 'Address in Arabic', 'شارع النصر');
    await fill(user, 'Coordinates', '31.52, 34.45');
    await user.click(screen.getByRole('button', { name: 'Add space' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/dashboard/admin/spaces');
    });
    expect(requests.find(({ method }) => method === 'post')).toMatchObject({
      url: '/admin/spaces',
    });
  });
});

describe("the admin's spaces page", () => {
  const PALM: AdminSpaceRow = {
    id: 9,
    slug: 'palm-hub',
    nameEn: 'Palm Hub',
    nameAr: null,
    area: { id: 21, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
    state: 'hidden',
    owners: [],
    staleGroups: [],
    missingGroups: ['hours'],
    lastUpdatedAt: '2026-09-20T08:00:00Z',
  };
  const META: PaginationMeta = {
    currentPage: 1,
    limit: 20,
    totalPages: 1,
    totalRecords: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  /** A list's answer: `rows` as page `currentPage` of `totalPages`. */
  const listOf = (rows: AdminSpaceRow[], currentPage = 1, totalPages = 1): FakeAnswer => ({
    status: 200,
    data: {
      success: true,
      data: rows,
      meta: { ...META, currentPage, totalPages, totalRecords: rows.length * totalPages },
    },
  });

  /**
   * The admin, on the spaces page at `search`; the list is answered by `list` from its request's
   * query, and every write is answered by `write`.
   */
  function openSpaces(
    search: string,
    list: (query: Record<string, unknown>) => FakeAnswer = () => listOf([PALM]),
    write: () => FakeAnswer = () => ({ status: 204 }),
  ) {
    signIn({ role: 'ADMIN' });
    fakeTransport((request) =>
      request.method !== 'get'
        ? write()
        : request.url === '/admin/spaces'
          ? list(request.params as Record<string, unknown>)
          : ok(
              request.url === '/admin/governorates'
                ? [{ id: 2, nameAr: 'محافظة غزة', nameEn: 'Gaza City', isActive: true, areas: [] }]
                : [],
            ),
    );
    renderDashboard(`/dashboard/admin/spaces${search}`);
  }

  it('shows the list under its title, each row with its menu, and the place field of the lookups', async () => {
    openSpaces('');

    expect(await topBarTitle()).toHaveTextContent('Spaces');
    const table = await screen.findByRole('table', { name: 'Spaces' });
    expect(await within(table).findByText('Palm Hub')).toBeInTheDocument();
    await userEvent.click(within(table).getByRole('button', { name: heard('Actions: Palm Hub') }));
    expect(await screen.findByRole('menuitem', { name: 'Show' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('combobox', { name: 'Governorate / area' }));
    expect(await screen.findByRole('option', { name: 'Gaza City' })).toBeInTheDocument();
  });

  it('leads from "Add space", above the list, to the add page, which adds no page to the sidebar', async () => {
    openSpaces('');

    await userEvent.click(await screen.findByRole('link', { name: 'Add space' }));

    // The add page loads lazily: its title replaces the list's in the top bar.
    expect(
      await within(screen.getByRole('banner')).findByRole('heading', {
        level: 1,
        name: 'Add space',
      }),
    ).toBeInTheDocument();
    expect(await pagesIn('Platform admin')).toEqual(ADMIN_PAGES);
    expect(
      within(screen.getByRole('navigation', { name: 'Platform admin' })).getByRole('link', {
        name: 'Spaces',
      }),
    ).toHaveAttribute('aria-current', 'page');
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(trail).getByRole('link', { name: 'Spaces' })).toHaveAttribute(
      'href',
      '/dashboard/admin/spaces',
    );
  });

  it('keeps every menu waiting out a 429 through a change of filter, then of page', async () => {
    const FOCUS: AdminSpaceRow = { ...PALM, id: 7, nameEn: 'Focus Hub', state: 'verified' };
    const WHITE: AdminSpaceRow = { ...PALM, id: 12, nameEn: 'White Space', state: 'verified' };
    openSpaces(
      '',
      (query) =>
        query.status !== 'verified'
          ? listOf([PALM])
          : query.page === 2
            ? listOf([WHITE], 2, 2)
            : listOf([FOCUS], 1, 2),
      () => refused(429, { type: 'rate_limit' }, { 'retry-after': '30' }),
    );
    const table = await screen.findByRole('table', { name: 'Spaces' });
    await userEvent.click(
      await within(table).findByRole('button', { name: heard('Actions: Palm Hub') }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Show' }));
    await screen.findByText(/Try again in/, { selector: '[data-slot=alert-description]' });

    // Palm Hub's row, the one refused, leaves with the filter; then the page changes.
    await userEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Verified' }));
    await within(table).findByText('Focus Hub');
    await userEvent.click(screen.getByRole('link', { name: 'Next' }));
    await within(table).findByText('White Space');

    await userEvent.click(
      within(table).getByRole('button', { name: heard('Actions: White Space') }),
    );
    for (const item of within(await screen.findByRole('menu')).getAllByRole('menuitem')) {
      expect(item).toHaveAttribute('aria-disabled', 'true');
    }
    expect(
      screen.getByText(/Try again in/, { selector: '[data-slot=alert-description]' }),
    ).toBeInTheDocument();
  });
});
