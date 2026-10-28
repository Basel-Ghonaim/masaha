import type { PaginationMeta } from '@masaha/shared/core';
import type { LookupsCatalogue } from '@masaha/shared/lookups';
import type { AdminSpaceRow, ManagedSpace, SessionSpaceLink } from '@masaha/shared/space-links';
import type { AdminSpace } from '@masaha/shared/spaces';
import { createQueryClient } from '@shared/api';
import { DocumentTitle, RecordTitleProvider } from '@shared/routing';
import { establishSession, restoreSession, type SessionUser } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { announcement, announcementsPage, announcementsSummary } from '../../test/announcement';
import { reportsPage, spaceReport } from '../../test/dataReport';
import { customerFile, customerRow, customersPage } from '../../test/deskCustomer';
import { fakeIntersectionObserver } from '../../test/fakeIntersectionObserver';
import { aSession } from '../../test/fakeSession';
import type { FakeAnswer } from '../../test/fakeAdapter';
import { fakeTransport, ok, refused, restoreTransport } from '../../test/fakeTransport';
import { paymentRow, paymentsPage } from '../../test/paymentRow';
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

/** The desk's state now, with no one present. */
const NO_ONE_PRESENT = {
  status: 'AVAILABLE',
  capacity: 40,
  present: 0,
  override: null,
  people: [],
};

/** The desk's terms: an hour and a day price, no student rates, no typed price. */
const VISIT_TERMS = {
  rounding: { rule: 'UP_AFTER_MINUTES', minutes: 15 },
  capAtDayPrice: true,
  mayTypePrice: false,
  rates: [{ shiftId: null, general: { hourAgorot: 500, dayAgorot: 2500 }, student: null }],
};

/** Signs in a user (id 1) with `fields`; their spaces are answered from their links. */
function signIn(fields: Partial<SessionUser>) {
  const { user } = aSession(fields);
  establishSession({ user, accessToken: 'token-1' }, { source: 'signIn' });
  fakeTransport((request) => {
    // The desk, where reception lands: its reads answered as the server would, with no one present.
    if (request.url?.endsWith('/occupancy') === true) return ok(NO_ONE_PRESENT);
    if (request.url?.endsWith('/visit-terms') === true) return ok(VISIT_TERMS);
    if (request.url?.endsWith('/check-ins') === true) return ok([]);
    return ok(
      user.spaces.map((link: SessionSpaceLink) => ({
        ...FOCUS,
        ...link,
        nameEn: link.spaceId === FOCUS.spaceId ? FOCUS.nameEn : 'Nook',
      })),
    );
  });
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

/**
 * The dashboard's real routes, beside home and sign-in, opened at `path`, under the record's title and
 * the document's, as the root layout holds them.
 */
function renderDashboard(path: string) {
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
        children: dashboardRoutes,
      },
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

/**
 * The page's title `name`, in the top bar. A page chosen in the app loads lazily, and the bar shows
 * the page before it until then, so the title is found by its name, never read at once.
 */
async function topBarTitle(name: string) {
  return within(await screen.findByRole('banner')).findByRole('heading', { level: 1, name });
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
  // Reception lands on the desk, which loads lazily: its first transform in this lane, cold, takes
  // seconds, so it is done before the tests, as the pages' own sections do (finding 28).
  beforeAll(async () => {
    await import('./space/desk/DeskPage');
  });

  it('lists the owner’s eleven pages, the overview marked as the page shown', async () => {
    asOwner();
    renderDashboard('/dashboard/spaces/7');

    expect(await pagesIn('Space dashboard')).toEqual(OWNER_PAGES);
    expect(
      within(screen.getByRole('navigation', { name: 'Space dashboard' })).getByRole('link', {
        name: 'Overview',
      }),
    ).toHaveAttribute('aria-current', 'page');
    expect(await topBarTitle('Overview')).toBeInTheDocument();
  });

  it('lists reception’s four pages at its space, the front desk among them', async () => {
    asReception();
    renderDashboard('/dashboard/spaces/7/desk');

    expect(await pagesIn('Space dashboard')).toEqual(RECEPTION_PAGES);
    expect(await topBarTitle('Front desk')).toBeInTheDocument();
  });

  it('lists the admin’s eight pages under the platform’s own header', async () => {
    signIn({ role: 'ADMIN' });
    renderDashboard('/dashboard/admin');

    expect(await pagesIn('Platform admin')).toEqual(ADMIN_PAGES);
    expect(screen.getByText('Masaha')).toBeInTheDocument();
    expect(await topBarTitle('Overview')).toBeInTheDocument();
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

    expect(await topBarTitle('Lookups')).toBeInTheDocument();
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

    expect(await topBarTitle('My payments today')).toBeInTheDocument();
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
    expect(await topBarTitle('Front desk')).toBeInTheDocument();
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

    await topBarTitle('Customers');
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

    expect(await topBarTitle('Front desk')).toBeInTheDocument();
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

    expect(await topBarTitle('Customers')).toBeInTheDocument();
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

/** A space just added: unverified, its profile dated, its other fact groups missing. */
const ADDED: AdminSpace = {
  id: 7,
  slug: 'focus-hub',
  nameEn: 'Focus Hub',
  nameAr: null,
  descriptionAr: null,
  descriptionEn: null,
  areaId: 11,
  addressAr: 'شارع النصر',
  addressEn: null,
  landmarkAr: null,
  landmarkEn: null,
  location: { lat: 31.52, lng: 34.45 },
  isHidden: false,
  isVerified: false,
  owners: [],
  updatedAt: {
    profile: '2026-10-10T08:00:00Z',
    hours: null,
    prices: null,
    amenities: null,
    contacts: null,
  },
  staleGroups: [],
  missingGroups: ['hours', 'prices', 'amenities', 'contacts'],
  hours: null,
  prices: [],
  amenityIds: [],
  ownAmenities: [],
  contacts: [],
};

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
    await Promise.all([
      import('./admin/AddSpacePage'),
      import('./admin/SpacesPage'),
      import('./admin/SpaceEditPage'),
    ]);
  });

  beforeEach(() => {
    fakeIntersectionObserver();
  });

  /** Pastes `text` into the field labelled `label`: typing key by key is the form's own tests'. */
  async function fill(user: ReturnType<typeof userEvent.setup>, label: string, text: string) {
    await user.click(screen.getByLabelText(label));
    await user.paste(text);
  }

  it('offers the public catalogue’s areas, and opens the new space’s editor once it is added', async () => {
    const user = userEvent.setup();
    signIn({ role: 'ADMIN' });
    const requests = fakeTransport((request) =>
      request.method === 'post'
        ? ok(ADDED, 201)
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
      expect(router.state.location.pathname).toBe('/dashboard/admin/spaces/7');
    });
    expect(requests.find(({ method }) => method === 'post')).toMatchObject({
      url: '/admin/spaces',
    });
    expect(await screen.findByRole('region', { name: 'Still missing' })).toBeInTheDocument();
    // The editor opens on the space the creation answered: it is not read again.
    expect(requests.filter(({ url }) => url === '/admin/spaces/7')).toEqual([]);
  });
});

describe("the admin's space editor", () => {
  // The editor loads lazily, and its first transform in this lane, cold, takes seconds: done before
  // the test, so its waits measure the routes, not Vite (finding 28).
  beforeAll(async () => {
    await import('./admin/SpaceEditPage');
  });

  beforeEach(() => {
    fakeIntersectionObserver();
  });

  it('is titled by the space’s name once it has loaded, in the top bar and the tab, under a trail back to the list', async () => {
    signIn({ role: 'ADMIN' });
    fakeTransport((request) => (request.url === '/admin/spaces/7' ? ok(ADDED) : ok([])));
    renderDashboard('/dashboard/admin/spaces/7');

    await topBarTitle('Focus Hub');
    await waitFor(() => {
      expect(document.title).toBe('Focus Hub · Masaha');
    });
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(trail).getByRole('link', { name: 'Spaces' })).toHaveAttribute(
      'href',
      '/dashboard/admin/spaces',
    );
    expect(await screen.findByRole('heading', { level: 2, name: 'The space' })).toBeInTheDocument();
  });

  it('is titled "Edit space" while the space loads', async () => {
    signIn({ role: 'ADMIN' });
    fakeTransport((request) =>
      request.url === '/admin/spaces/7' ? new Promise<FakeAnswer>(() => undefined) : ok([]),
    );
    renderDashboard('/dashboard/admin/spaces/7');

    await topBarTitle('Edit space');
  });

  it('shows the 404 inside the shell for an id that names no space', async () => {
    signIn({ role: 'ADMIN' });
    renderDashboard('/dashboard/admin/spaces/abc');

    await stateInMain('Page not found');
  });
});

describe("the owner's space profile", () => {
  // The profile loads lazily, as the admin's editor does: its first transform is done before the test.
  beforeAll(async () => {
    await import('./space/ProfilePage');
  });

  beforeEach(() => {
    fakeIntersectionObserver();
  });

  it('shows the owner the space profile under its title, read from the managed route', async () => {
    asOwner();
    const requests = fakeTransport((request) => {
      if (request.url === '/manage/spaces/7') return ok({ ...ADDED, isVerified: true });
      if (request.url === '/manage/spaces') return ok([FOCUS]);
      if (request.url === '/lookups') return ok({ governorates: [], amenities: [] });
      return ok([]);
    });
    renderDashboard('/dashboard/spaces/7/profile');

    await topBarTitle('Space profile');
    expect(await screen.findByRole('heading', { level: 2, name: 'The space' })).toBeInTheDocument();
    expect(requests.map(({ url }) => url)).toContain('/manage/spaces/7');
    expect(requests.filter(({ url }) => url?.startsWith('/admin/') === true)).toEqual([]);
  });

  it('refuses reception the space profile with the 403', async () => {
    asReception();
    renderDashboard('/dashboard/spaces/7/profile');

    expect(await stateInMain('You don’t have access to this page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'The space' })).toBeNull();
  });
});

describe("the owner's packages and prices", () => {
  // The page loads lazily, as the profile does: its first transform is done before the test.
  beforeAll(async () => {
    await import('./space/PackagesPage');
  });

  it('shows the owner Packages & prices under its title, its prices and packages read from the managed routes', async () => {
    asOwner();
    const requests = fakeTransport((request) => {
      if (request.url === '/manage/spaces/7') return ok({ ...ADDED, isVerified: true });
      if (request.url === '/manage/spaces') return ok([FOCUS]);
      return ok([]);
    });
    renderDashboard('/dashboard/spaces/7/packages');

    await topBarTitle('Packages & prices');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Published prices' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Private packages' }),
    ).toBeInTheDocument();
    expect(requests.map(({ url }) => url)).toContain('/manage/spaces/7/packages');
    expect(requests.map(({ url }) => url)).toContain('/manage/spaces/7');
    expect(requests.filter(({ url }) => url?.startsWith('/admin/') === true)).toEqual([]);
  });
});

describe("the space's front desk", () => {
  // The page loads lazily, as the profile does: its first transform is done before the test.
  beforeAll(async () => {
    await import('./space/desk/DeskPage');
  });

  /** The desk's reads: who is present, the visit terms and the space, each from the managed route. */
  function serveDesk() {
    return fakeTransport((request) => {
      if (request.url === '/manage/spaces/7/occupancy') {
        return ok({
          status: 'AVAILABLE',
          capacity: 40,
          present: 1,
          override: null,
          people: [
            {
              kind: 'VISIT',
              id: 12,
              name: 'Omar',
              since: '2026-07-01T07:00:00.000Z',
              chargeNowAgorot: 500,
            },
          ],
        });
      }
      if (request.url === '/manage/spaces/7/visit-terms') return ok(VISIT_TERMS);
      if (request.url === '/manage/spaces/7') return ok({ ...ADDED, isVerified: true });
      if (request.url === '/manage/spaces') return ok([FOCUS]);
      return ok([]);
    });
  }

  it.each([
    ['the owner', asOwner],
    ['reception', asReception],
  ])(
    'shows %s the desk under its title, with who is present and their check-out',
    async (_, as) => {
      as();
      const requests = serveDesk();
      renderDashboard('/dashboard/spaces/7/desk');

      await topBarTitle('Front desk');
      expect(
        await screen.findByRole('heading', { level: 2, name: 'Present now 1 / 40' }),
      ).toBeInTheDocument();
      expect(
        await screen.findByRole('button', { name: heard('Check out Omar') }),
      ).toBeInTheDocument();
      const bar = within(await screen.findByRole('banner'));
      expect(bar.getByRole('button', { name: 'Check in a visit' })).toBeInTheDocument();
      expect(bar.getByRole('button', { name: 'Switch staff' })).toBeInTheDocument();
      expect(requests.map(({ url }) => url)).toContain('/manage/spaces/7/visit-terms');
    },
  );

  it('puts «Check in a visit» in the bar at the foot below 768 px, and «Switch staff» in the «⋯» menu', async () => {
    const user = userEvent.setup();
    stubScreenWidth(390);
    asReception();
    serveDesk();
    renderDashboard('/dashboard/spaces/7/desk');

    await topBarTitle('Front desk');
    const action = await screen.findByRole('button', { name: 'Check in a visit' });
    expect(screen.getByRole('banner')).not.toContainElement(action);
    expect(screen.getByRole('main')).not.toContainElement(action);
    await user.click(
      within(screen.getByRole('banner')).getByRole('button', { name: 'More actions' }),
    );
    expect(await screen.findByRole('menuitem', { name: 'Switch staff' })).toBeInTheDocument();
  });
});

describe("the space's payments", () => {
  // The page loads lazily, as the customers' do: its first transform is done before the test.
  beforeAll(async () => {
    await import('./space/payments/PaymentsPage');
    await import('./space/payments/MyPaymentsPage');
  });

  it('shows the owner the ledger under «Payments», each customer a link to their file', async () => {
    asOwner();
    const requests = fakeTransport((request) => {
      if (request.url === '/manage/spaces/7/payments') return paymentsPage([paymentRow()]);
      if (request.url === '/manage/spaces') return ok([FOCUS]);
      return ok([]);
    });
    renderDashboard('/dashboard/spaces/7/payments');

    await topBarTitle('Payments');
    const ledger = await screen.findByRole('table', { name: 'Payments ledger' });
    expect(await within(ledger).findByRole('link', { name: 'Sara Khalid' })).toHaveAttribute(
      'href',
      '/dashboard/spaces/7/customers/4',
    );
    expect(requests.map(({ url }) => url)).toEqual(
      expect.arrayContaining(['/manage/spaces/7/payments', '/manage/spaces/7/staff']),
    );
  });

  it('shows reception «My payments today»: the handover figures and its own payments', async () => {
    asReception();
    const requests = fakeTransport((request) => {
      if (request.url === '/manage/spaces/7/payments') return paymentsPage([paymentRow()]);
      if (request.url === '/manage/spaces') return ok([FOCUS]);
      return ok([]);
    });
    renderDashboard('/dashboard/spaces/7/my-payments');

    await topBarTitle('My payments today');
    expect(await screen.findByRole('region', { name: 'Handover figures' })).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'My payments today' })).toBeInTheDocument();
    expect(requests.find(({ url }) => url === '/manage/spaces/7/payments')?.params).toEqual({
      voided: 'INCLUDE',
      page: 1,
      limit: 20,
    });
  });
});

describe("the space's data reports", () => {
  // The page loads lazily, as the payments' do: its first transform is done before the test.
  beforeAll(async () => {
    await import('./space/reports/DataReportsPage');
  });

  it('shows the owner «Data reports» under its title, the reporter a visitor', async () => {
    asOwner();
    const requests = fakeTransport((request) => {
      if (request.url === '/manage/spaces/7/data-reports') return reportsPage([spaceReport()]);
      if (request.url === '/manage/spaces') return ok([FOCUS]);
      return ok([]);
    });
    renderDashboard('/dashboard/spaces/7/reports');

    await topBarTitle('Data reports');
    const table = await screen.findByRole('table', { name: 'Data reports' });
    expect(await within(table).findByText('The space opens at 9, not 8.')).toBeVisible();
    expect(requests.find(({ url }) => url === '/manage/spaces/7/data-reports')?.params).toEqual({
      page: 1,
      limit: 20,
    });
  });

  it('refuses reception the space’s data reports with the 403', async () => {
    asReception();
    renderDashboard('/dashboard/spaces/7/reports');

    expect(await stateInMain('You don’t have access to this page')).toBeInTheDocument();
  });
});

describe("the space's customers", () => {
  // The page loads lazily, as the profile does: its first transform is done before the test.
  beforeAll(async () => {
    await import('./space/customers/CustomersPage');
    await import('./space/customers/CustomerPage');
  });

  it.each([
    ['the owner', asOwner],
    ['reception', asReception],
  ])('shows %s the customers under its title, each a link to the file', async (_, as) => {
    as();
    const requests = fakeTransport((request) => {
      if (request.url === '/manage/spaces/7/customers') {
        return customersPage([customerRow({ id: 4, name: 'Sara Khalid' })]);
      }
      if (request.url === '/manage/spaces') return ok([FOCUS]);
      return ok([]);
    });
    renderDashboard('/dashboard/spaces/7/customers');

    await topBarTitle('Customers');
    expect(await screen.findByRole('link', { name: 'Sara Khalid' })).toHaveAttribute(
      'href',
      '/dashboard/spaces/7/customers/4',
    );
    expect(requests.map(({ url }) => url)).toContain('/manage/spaces/7/customers');
  });

  it.each([
    ['the owner', asOwner],
    ['reception', asReception],
  ])(
    'shows %s a customer’s file titled by their name, under a trail back to the list',
    async (_, as) => {
      as();
      fakeTransport((request) => {
        if (request.url === '/manage/spaces/7/customers/4') return ok(customerFile());
        if (request.url === '/manage/spaces') return ok([FOCUS]);
        return ok([]);
      });
      renderDashboard('/dashboard/spaces/7/customers/4');

      await topBarTitle('Sara Khalid');
      await waitFor(() => {
        expect(document.title).toBe('Sara Khalid · Masaha');
      });
      const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(within(trail).getByRole('link', { name: 'Customers' })).toHaveAttribute(
        'href',
        '/dashboard/spaces/7/customers',
      );
      expect(
        await screen.findByRole('heading', { level: 2, name: 'Subscriptions' }),
      ).toBeInTheDocument();
    },
  );

  it('titles the file «Customer file» while it loads', async () => {
    asReception();
    fakeTransport((request) =>
      request.url === '/manage/spaces/7/customers/4'
        ? new Promise<FakeAnswer>(() => undefined)
        : request.url === '/manage/spaces'
          ? ok([FOCUS])
          : ok([]),
    );
    renderDashboard('/dashboard/spaces/7/customers/4');

    await topBarTitle('Customer file');
  });
});

describe("the owner's staff", () => {
  // The page loads lazily, as the profile does: its first transform is done before the test.
  beforeAll(async () => {
    await import('./space/StaffPage');
  });

  it('shows the owner the staff page under its title, its list read from the managed route', async () => {
    asOwner();
    const requests = fakeTransport((request) => {
      if (request.url === '/manage/spaces/7/staff') {
        return ok([
          {
            userId: 15,
            name: 'Rahaf',
            email: 'rahaf@example.com',
            isActive: true,
            temporaryPassword: null,
          },
        ]);
      }
      if (request.url === '/manage/spaces') return ok([FOCUS]);
      return ok([]);
    });
    renderDashboard('/dashboard/spaces/7/staff');

    await topBarTitle('Staff');
    expect(await screen.findByText('rahaf@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add staff member' })).toBeInTheDocument();
    expect(requests.map(({ url }) => url)).toContain('/manage/spaces/7/staff');
  });

  it('refuses reception the staff page with the 403', async () => {
    asReception();
    renderDashboard('/dashboard/spaces/7/staff');

    expect(await stateInMain('You don’t have access to this page')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add staff member' })).toBeNull();
  });
});

describe("the owner's settings", () => {
  // The page loads lazily, as the profile does: its first transform is done before the test.
  beforeAll(async () => {
    await import('./space/SettingsPage');
  });

  it('shows the owner the settings page under its title, read from the managed route', async () => {
    asOwner();
    const requests = fakeTransport((request) => {
      if (request.url === '/manage/spaces/7/settings') {
        return ok({
          autoCheckoutAtClosing: true,
          maxStayMinutes: null,
          visitRounding: 'PER_MINUTE',
          visitRoundingMinutes: null,
          visitCapAtDayPrice: true,
          visitStudentPrices: false,
          receptionMayTypePrices: false,
          reminderTemplate: null,
        });
      }
      if (request.url === '/manage/spaces') return ok([FOCUS]);
      return ok({ capacity: null });
    });
    renderDashboard('/dashboard/spaces/7/settings');

    await topBarTitle('Settings');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Visit pricing' }),
    ).toBeInTheDocument();
    expect(requests.map(({ url }) => url)).toContain('/manage/spaces/7/settings');
  });

  it('refuses reception the settings page with the 403', async () => {
    asReception();
    renderDashboard('/dashboard/spaces/7/settings');

    expect(await stateInMain('You don’t have access to this page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Visit pricing' })).toBeNull();
  });
});

describe("the admin's spaces page", () => {
  const PALM: AdminSpaceRow = {
    id: 9,
    slug: 'palm-hub',
    nameEn: 'Palm Hub',
    nameAr: null,
    area: { id: 21, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
    isVerified: false,
    isHidden: true,
    deletedAt: null,
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

    expect(await topBarTitle('Spaces')).toBeInTheDocument();
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

  it('keeps every menu’s actions waiting out a 429 through a change of filter, then of page', async () => {
    const FOCUS: AdminSpaceRow = { ...PALM, id: 7, nameEn: 'Focus Hub', isHidden: false };
    const WHITE: AdminSpaceRow = { ...PALM, id: 12, nameEn: 'White Space', isHidden: false };
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
    // The actions wait; Edit, a way to a page, never does.
    const menu = await screen.findByRole('menu');
    for (const name of ['Hide', 'Delete']) {
      expect(within(menu).getByRole('menuitem', { name })).toHaveAttribute('aria-disabled', 'true');
    }
    expect(
      screen.getByText(/Try again in/, { selector: '[data-slot=alert-description]' }),
    ).toBeInTheDocument();
  });
});

describe("the admin's owners page", () => {
  it('shows the admin’s owners page under its title, with the owners', async () => {
    signIn({ role: 'ADMIN' });
    fakeTransport((request) =>
      request.url === '/admin/users'
        ? {
            status: 200,
            data: {
              success: true,
              data: [
                {
                  id: 5,
                  name: 'Rima',
                  email: 'rima@example.com',
                  role: 'OWNER',
                  isSuspended: false,
                  signIn: { password: true, google: false },
                  joinedAt: '2026-09-01T08:00:00Z',
                  spaces: [{ id: 7, nameEn: 'Focus Hub', nameAr: null }],
                  receptionSpaces: [],
                },
              ],
              meta: {
                currentPage: 1,
                limit: 20,
                totalPages: 1,
                totalRecords: 1,
                hasNextPage: false,
                hasPreviousPage: false,
              },
            },
          }
        : ok([]),
    );
    renderDashboard('/dashboard/admin/owners');

    expect(await topBarTitle('Space owners')).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Space owners' });
    expect(await within(table).findByText('Rima')).toBeInTheDocument();
    expect(within(table).getByText('Focus Hub')).toBeInTheDocument();
  });

  it('offers «Add owner» above the owners list', async () => {
    signIn({ role: 'ADMIN' });
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
    renderDashboard('/dashboard/admin/owners');

    const add = await screen.findByRole('button', { name: 'Add owner' });
    const list = await screen.findByText('No space owners yet');
    expect(add.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("the admin's users page", () => {
  it('shows the admin’s users page under its title, with the users', async () => {
    signIn({ role: 'ADMIN' });
    fakeTransport((request) =>
      request.url === '/admin/users'
        ? {
            status: 200,
            data: {
              success: true,
              data: [
                {
                  id: 8,
                  name: 'Nour',
                  email: 'nour@example.com',
                  role: 'USER',
                  isSuspended: false,
                  signIn: { password: true, google: false },
                  joinedAt: '2026-09-01T08:00:00Z',
                  spaces: [],
                  receptionSpaces: [{ id: 7, nameEn: 'Focus Hub', nameAr: null }],
                },
              ],
              meta: {
                currentPage: 1,
                limit: 20,
                totalPages: 1,
                totalRecords: 1,
                hasNextPage: false,
                hasPreviousPage: false,
              },
            },
          }
        : ok([]),
    );
    renderDashboard('/dashboard/admin/users');

    expect(await topBarTitle('Users')).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Users' });
    expect(await within(table).findByText('Nour')).toBeInTheDocument();
    expect(within(table).getByText('Focus Hub')).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: heard('Actions: Nour') })).toBeInTheDocument();
  });
});

describe("the space's announcements", () => {
  // The page loads lazily, as the payments' do: its first transform is done before the test.
  beforeAll(async () => {
    await import('./space/announcements/AnnouncementsPage');
  });

  /** The announcements' reads, answered as the server would, with one running announcement. */
  const serveAnnouncements = () =>
    fakeTransport((request) => {
      if (request.url === '/manage/spaces/7/announcements/summary')
        return ok(announcementsSummary());
      if (request.url === '/manage/spaces/7/announcements')
        return announcementsPage([announcement()]);
      if (request.url === '/manage/spaces') return ok([FOCUS]);
      return ok([]);
    });

  it('shows the owner the announcements under «Announcements», by state', async () => {
    asOwner();
    serveAnnouncements();
    renderDashboard('/dashboard/spaces/7/announcements');

    await topBarTitle('Announcements');
    expect(await screen.findByRole('tablist', { name: 'Announcement status' })).toBeInTheDocument();
    const list = await screen.findByRole('region', { name: 'Announcements' });
    expect(
      await within(list).findByText('A design workshop on Thursday evening'),
    ).toBeInTheDocument();
  });

  it('shows reception the same announcements under «Announcements»', async () => {
    asReception();
    serveAnnouncements();
    renderDashboard('/dashboard/spaces/7/announcements');

    await topBarTitle('Announcements');
    const list = await screen.findByRole('region', { name: 'Announcements' });
    expect(
      await within(list).findByText('A design workshop on Thursday evening'),
    ).toBeInTheDocument();
  });
});
