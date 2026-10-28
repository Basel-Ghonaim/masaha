import { DocumentTitle, RecordTitleProvider } from '@shared/routing';
import { establishSession, restoreSession } from '@shared/session';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { publicAnnouncement } from '../../../../test/announcement';
import { aSession } from '../../../../test/fakeSession';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { publicSpace } from '../../../../test/publicSpace';
import { queryWrapper } from '../../../../test/queryWrapper';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { setSessionHint } from '../../../../test/sessionHint';
import { startPreferences } from '../../../../test/startPreferences';
import { siteRoutes } from '../../routes';

/** «Noor Hub»'s page in the site's shell, the server answering its reads, `change` its space's. */
async function renderSpacePage(change: Parameters<typeof publicSpace>[0] = {}) {
  const requests = fakeTransport((request) =>
    request.url === '/spaces'
      ? ok([], 200)
      : request.url === '/lookups'
        ? ok({ governorates: [], areas: [], amenities: [] })
        : request.url?.endsWith('/occupancy')
          ? ok({ status: null })
          : request.url === '/me/favorites'
            ? ok([])
            : request.method === 'post'
              ? { status: 204 }
              : ok(publicSpace(change)),
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
  return { router, requests };
}

async function becomeGuest() {
  setSessionHint(false);
  await restoreSession();
}

// The shell and the page load lazily; their first transform is the file's start-up, not a test's.
beforeAll(async () => {
  await Promise.all([import('../../shell/SiteLayout'), import('./SpacePage')]);
});

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
  document.cookie = 'masaha_session=; Path=/; Max-Age=0';
});

/** A running closure, since an hour ago with no end, and an offer starting tomorrow. */
function announcements() {
  const now = Date.now();
  return [
    publicAnnouncement({
      id: 3,
      type: 'CLOSURE',
      textEn: 'Closed for maintenance',
      startsAt: new Date(now - 3_600_000).toISOString(),
    }),
    publicAnnouncement({
      id: 4,
      type: 'OFFER',
      textEn: 'Half price for students',
      startsAt: new Date(now + 86_400_000).toISOString(),
    }),
  ];
}

/** Whether `later` follows `earlier` in the document. */
const follows = (earlier: Element, later: Element) =>
  Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('a space’s page', () => {
  it.each([390, 1440])(
    'keeps U8’s order at %i px: the closure’s notice first, the announcements after the status and before the prices, the report last',
    async (width) => {
      stubScreenWidth(width);
      await becomeGuest();
      await renderSpacePage({ announcements: announcements() });

      // The closure's warning: its text, inside the layer's polite status region.
      const notice = screen.getByText('Closed for maintenance', { selector: '[role="status"] *' });
      const name = screen.getByRole('heading', { level: 1, name: 'Noor Hub' });
      expect(follows(notice, name)).toBe(true);

      const section = screen.getByRole('region', { name: 'Announcements' });
      expect(section).toHaveTextContent('Half price for students');
      expect(section).not.toHaveTextContent('Closed for maintenance');
      // Below 1024 px the status is a card in the main column; from it, an aside beside the sections.
      if (width === 390) {
        const status = screen.getByRole('heading', { level: 2, name: 'Status' });
        expect(follows(status, section)).toBe(true);
      }
      expect(follows(name, section)).toBe(true);
      const prices = screen.getByRole('heading', { level: 2, name: 'Prices' });
      expect(follows(section, prices)).toBe(true);
      const report = screen.getByRole('button', { name: 'Report wrong information' });
      expect(follows(prices, report)).toBe(true);
    },
  );

  it('draws «Report wrong information» last in its main column, after the location and the contacts', async () => {
    stubScreenWidth(390);
    await becomeGuest();
    await renderSpacePage();

    const report = screen.getByRole('button', { name: 'Report wrong information' });
    for (const name of ['Prices', 'Opening hours', 'Location']) {
      const heading = screen.getByRole('heading', { level: 2, name });
      expect(
        heading.compareDocumentPosition(report) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it('asks a guest to sign in to report; back signed in, the report’s dialog is open', async () => {
    stubScreenWidth(1440);
    await becomeGuest();
    await renderSpacePage();

    await userEvent.click(screen.getByRole('button', { name: 'Report wrong information' }));
    const prompt = await screen.findByRole('dialog', { name: 'Sign in to report information' });
    expect(within(prompt).getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      `/login?next=${encodeURIComponent('/spaces/noor-hub')}`,
    );

    act(() => {
      establishSession(aSession(), { source: 'signIn' });
    });
    expect(
      await screen.findByRole('dialog', { name: 'Report wrong information' }),
    ).toBeInTheDocument();
  });

  it('lets the report go when the guest closes the sign-in', async () => {
    stubScreenWidth(1440);
    await becomeGuest();
    await renderSpacePage();

    await userEvent.click(screen.getByRole('button', { name: 'Report wrong information' }));
    const prompt = await screen.findByRole('dialog', { name: 'Sign in to report information' });
    await userEvent.click(within(prompt).getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    act(() => {
      establishSession(aSession(), { source: 'signIn' });
    });
    // The page renders again with the session; no dialog opens by itself.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Report wrong information' })).toBeInTheDocument();
  });

  it('sets the heart beside the space’s name; a guest’s press asks to sign in, and back signed in the space is saved', async () => {
    stubScreenWidth(1440);
    await becomeGuest();
    const { requests } = await renderSpacePage();

    const name = screen.getByRole('heading', { level: 1, name: 'Noor Hub' });
    const heart = screen.getByRole('button', { name: /^Save .Noor Hub. to favourites$/ });
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    expect(name.parentElement).toContainElement(heart);

    await userEvent.click(heart);
    expect(
      await screen.findByRole('dialog', { name: 'Sign in to save spaces to your favourites' }),
    ).toBeInTheDocument();

    act(() => {
      establishSession(aSession(), { source: 'signIn' });
    });
    await waitFor(() => {
      expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toContain(
        'post /me/favorites/7',
      );
    });
  });

  it('shows the heart pressed once a guest’s held favourite is saved on their return', async () => {
    stubScreenWidth(1440);
    await becomeGuest();
    const saved = new Set<number>();
    const space = publicSpace();
    fakeTransport((request) => {
      if (request.url === '/lookups') return ok({ governorates: [], areas: [], amenities: [] });
      if (request.url?.endsWith('/occupancy')) return ok({ status: null });
      if (request.url === '/me/favorites')
        return ok(
          [...saved].map((id) => ({
            listed: true,
            savedAt: '2026-10-27T09:00:00.000Z',
            space: { ...space, id, days: null, cover: null, liveStatus: null },
          })),
        );
      if (request.method === 'post' && request.url === '/me/favorites/7') {
        saved.add(7);
        return { status: 204 };
      }
      return ok(space);
    });
    const router = createMemoryRouter(
      [{ HydrateFallback: () => null, element: <Outlet />, children: siteRoutes }],
      { initialEntries: ['/spaces/noor-hub'] },
    );
    const Wrapper = queryWrapper();
    render(
      <Wrapper>
        <RouterProvider router={router} />
      </Wrapper>,
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /^Save .Noor Hub. to favourites$/ }),
    );
    await screen.findByRole('dialog', { name: 'Sign in to save spaces to your favourites' });

    act(() => {
      establishSession(aSession(), { source: 'signIn' });
    });
    // The prompt stays open here (the guest signed in without leaving), so the page is hidden under it.
    const heart = screen.getByRole('button', {
      name: /^Save .Noor Hub. to favourites$/,
      hidden: true,
    });
    await waitFor(
      () => {
        expect(heart).toHaveAttribute('aria-pressed', 'true');
      },
      { timeout: 4000 },
    );
  });

  describe('a guest who leaves for another page', () => {
    it('lets the held favourite go: a later sign-in in the tab saves nothing', async () => {
      stubScreenWidth(1440);
      await becomeGuest();
      const { router, requests } = await renderSpacePage();

      await userEvent.click(
        screen.getByRole('button', { name: /^Save .Noor Hub. to favourites$/ }),
      );
      await screen.findByRole('dialog', { name: 'Sign in to save spaces to your favourites' });
      // Not through the prompt's links: the guest goes elsewhere on the site.
      await act(() => router.navigate('/spaces'));
      await screen.findByRole('heading', { level: 1, name: 'Workspaces' });

      act(() => {
        establishSession(aSession(), { source: 'signIn' });
      });
      await act(() => new Promise((resolve) => setTimeout(resolve, 100)));
      expect(requests.filter(({ method }) => method === 'post')).toHaveLength(0);
    });

    it('lets the held report go: back on the page signed in, its dialog does not open', async () => {
      stubScreenWidth(1440);
      await becomeGuest();
      const { router } = await renderSpacePage();

      await userEvent.click(screen.getByRole('button', { name: 'Report wrong information' }));
      await screen.findByRole('dialog', { name: 'Sign in to report information' });
      await act(() => router.navigate('/spaces'));
      await screen.findByRole('heading', { level: 1, name: 'Workspaces' });

      act(() => {
        establishSession(aSession(), { source: 'signIn' });
      });
      await act(() => router.navigate('/spaces/noor-hub'));
      await screen.findByRole('heading', { level: 1, name: 'Noor Hub' });
      await act(() => new Promise((resolve) => setTimeout(resolve, 100)));
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
