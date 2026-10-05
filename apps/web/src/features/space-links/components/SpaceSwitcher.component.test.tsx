import type { ManagedSpace } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { Sidebar, SidebarProvider } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useParams } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { deferred } from '../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { stubScreenWidth } from '../../../test/screenWidth';
import { startPreferences } from '../../../test/startPreferences';
import { SpaceSwitcher } from './SpaceSwitcher';

const FOCUS: ManagedSpace = {
  spaceId: 7,
  role: 'OWNER',
  slug: 'focus-hub',
  nameAr: 'فوكس هب',
  nameEn: 'Focus Hub',
  area: { nameAr: 'النصر', nameEn: 'An-Nasr' },
};

const NOOK: ManagedSpace = {
  spaceId: 3,
  role: 'RECEPTION',
  slug: 'nook',
  nameAr: 'ركن',
  nameEn: null,
  area: { nameAr: 'الرمال', nameEn: 'Al-Rimal' },
};

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

/** A space's page, at /spaces/:spaceId, whose sidebar holds the switcher. */
function SpacePage() {
  const { spaceId } = useParams();
  return (
    <SidebarProvider>
      <Sidebar label="Space dashboard">
        <SpaceSwitcher
          spaceId={Number(spaceId) || undefined}
          spaceLink={({ spaceId: id, role }) => `/spaces/${String(id)}/${role.toLowerCase()}`}
        />
      </Sidebar>
    </SidebarProvider>
  );
}

/** The switcher on the page at `path`, the user's spaces answered by `answer`. */
function renderSwitcher(path: string, answer: () => FakeAnswer | Promise<FakeAnswer>) {
  const requests = fakeTransport(answer);
  const router = createMemoryRouter(
    [
      { path: '/spaces/:spaceId', Component: SpacePage },
      { path: '/spaces/:spaceId/:page', Component: SpacePage },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, requests };
}

beforeEach(() => {
  startPreferences('en');
  stubScreenWidth(1280);
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('SpaceSwitcher', () => {
  it('shows the only space, its name and area, with no list to open', async () => {
    renderSwitcher('/spaces/7', () => ok([FOCUS]));

    expect(await screen.findByText('Focus Hub')).toBeInTheDocument();
    expect(screen.getByText('An-Nasr')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows placeholders in a busy status named Loading while the spaces load, then the space', async () => {
    const answer = deferred<FakeAnswer>();
    renderSwitcher('/spaces/7', () => answer.promise);

    const loading = screen.getByRole('status', { name: 'Loading' });
    expect(loading).toHaveAttribute('aria-busy', 'true');
    expect(loading.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    answer.resolve(ok([FOCUS]));

    expect(await screen.findByText('Focus Hub')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument();
  });

  it('says the spaces could not load, and Try again asks for them again', async () => {
    const user = userEvent.setup();
    let calls = 0;
    const { requests } = renderSwitcher('/spaces/7', () => {
      calls += 1;
      return calls === 1 ? refused(403, { type: 'forbidden' }) : ok([FOCUS]);
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load your spaces');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Focus Hub')).toBeInTheDocument();
    expect(requests.map(({ url }) => url)).toEqual(['/manage/spaces', '/manage/spaces']);
  });

  it('opens the user’s spaces when there are several, marking the one shown', async () => {
    const user = userEvent.setup();
    renderSwitcher('/spaces/7', () => ok([FOCUS, NOOK]));

    await user.click(await screen.findByRole('button', { name: heard('Switch space: Focus Hub') }));

    const menu = within(await screen.findByRole('menu'));
    expect(menu.getByText('Your spaces')).toBeInTheDocument();
    const items = menu.getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['Focus HubAn-Nasr', 'ركنAl-Rimal']);
    expect(items[0]).toHaveAttribute('aria-current', 'true');
    expect(items[1]).not.toHaveAttribute('aria-current');
  });

  it('marks an Arabic name shown in the English interface as Arabic', async () => {
    const user = userEvent.setup();
    renderSwitcher('/spaces/7', () => ok([FOCUS, NOOK]));
    await user.click(await screen.findByRole('button', { name: heard('Switch space: Focus Hub') }));

    const name = within(await screen.findByRole('menu')).getByText('ركن');
    expect(name).toHaveAttribute('lang', 'ar');
    expect(name).toHaveAttribute('dir', 'rtl');
  });

  it('goes to the chosen space, by the link the page gives, and then shows it', async () => {
    const user = userEvent.setup();
    const { router } = renderSwitcher('/spaces/7', () => ok([FOCUS, NOOK]));

    await user.click(await screen.findByRole('button', { name: heard('Switch space: Focus Hub') }));
    await user.click(
      within(await screen.findByRole('menu')).getByRole('menuitem', { name: /ركن/ }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/spaces/3/reception');
    });
    expect(
      await screen.findByRole('button', { name: heard('Switch space: ركن') }),
    ).toBeInTheDocument();
  });

  it('offers the user’s spaces when the space in the URL is none of theirs', async () => {
    const user = userEvent.setup();
    renderSwitcher('/spaces/9', () => ok([FOCUS]));

    await user.click(await screen.findByRole('button', { name: 'Choose a space' }));

    expect(
      within(await screen.findByRole('menu')).getByRole('menuitem', { name: /Focus Hub/ }),
    ).toHaveAttribute('href', '/spaces/7/owner');
  });
});
