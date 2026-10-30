import { createQueryClient } from '@shared/api';
import { RecordTitleProvider } from '@shared/routing';
import { establishSession, type SessionUser } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportsPage } from '../../../../test/dataReport';
import { aSession } from '../../../../test/fakeSession';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { dashboardRoutes } from '../../routes';

/** Signs in a user whose link at space 7 has `role`; the shell's reads answered as the server would. */
function signIn(spaces: SessionUser['spaces']) {
  const { user } = aSession({ spaces });
  establishSession({ user, accessToken: 'token-1' }, { source: 'signIn' });
  return fakeTransport((request) => {
    if (request.url?.endsWith('/data-reports') === true) return reportsPage([], { total: 0 });
    return ok(
      spaces.map((link) => ({
        ...link,
        slug: 'focus-hub',
        nameAr: 'فوكس هب',
        nameEn: 'Focus Hub',
        area: { nameAr: 'النصر', nameEn: 'An-Nasr' },
      })),
    );
  });
}

/** The dashboard's real routes, opened at `path`. */
function renderDashboard(path: string) {
  const router = createMemoryRouter(
    [
      {
        HydrateFallback: () => null,
        element: (
          <RecordTitleProvider>
            <Outlet />
          </RecordTitleProvider>
        ),
        children: dashboardRoutes,
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
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

describe("the owner's overview page", () => {
  // The shell and the page load lazily: their first transform in this lane, cold, takes seconds, so
  // it is done before the test (finding 28).
  beforeAll(async () => {
    await Promise.all([import('../../shell/SpaceLayout'), import('./OverviewPage')]);
  });

  it('refuses reception with the 403 inside the shell, reading no overview', async () => {
    const requests = signIn([{ spaceId: 7, role: 'RECEPTION' }]);
    renderDashboard('/dashboard/spaces/7');

    const main = await screen.findByRole('main');
    expect(
      await within(main).findByRole('heading', { name: 'You don’t have access to this page' }),
    ).toBeInTheDocument();
    expect(requests.some((request) => request.url?.endsWith('/overview') === true)).toBe(false);
  });
});
