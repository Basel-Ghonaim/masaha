import { createQueryClient } from '@shared/api';
import { RecordTitleProvider } from '@shared/routing';
import { establishSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { aSession } from '../../../../test/fakeSession';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { paymentRow, paymentsPage } from '../../../../test/paymentRow';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { dashboardRoutes } from '../../routes';

/** Signs in Ahmad, owner of space 7, its reads answered as the server would. */
function signIn() {
  const { user } = aSession({ id: 14, name: 'Ahmad', spaces: [{ spaceId: 7, role: 'OWNER' }] });
  establishSession({ user, accessToken: 'token-1' }, { source: 'signIn' });
  return fakeTransport((request) => {
    const url = request.url ?? '';
    if (url === '/manage/spaces/7/payments') return paymentsPage([paymentRow()]);
    if (url === '/manage/spaces/7/staff') {
      return ok([
        {
          userId: 15,
          name: 'Laila',
          email: 'laila@example.com',
          isActive: true,
          addedAt: '2026-10-01T08:00:00.000Z',
          temporaryPassword: null,
        },
      ]);
    }
    if (url === '/manage/spaces/7') {
      return ok({
        id: 7,
        owners: [
          { id: 14, name: 'Ahmad' },
          { id: 16, name: 'Mona' },
        ],
      });
    }
    return ok([
      {
        spaceId: 7,
        role: 'OWNER',
        slug: 'focus-hub',
        nameAr: 'فوكس هب',
        nameEn: 'Focus Hub',
        area: { nameAr: 'النصر', nameEn: 'An-Nasr' },
      },
    ]);
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

describe("the owner's payments page", () => {
  // The shell and the page load lazily: their first transform in this lane, cold, takes seconds, so
  // it is done before the test (finding 28).
  beforeAll(async () => {
    await Promise.all([import('../../shell/SpaceLayout'), import('./PaymentsPage')]);
  });

  it('names the space’s other owners in the staff filter, after the owner signed in', async () => {
    const user = userEvent.setup();
    const requests = signIn();
    renderDashboard('/dashboard/spaces/7/payments');

    const staff = await screen.findByRole('combobox', { name: 'Staff' });
    // The filter names whom the reads name, once both have answered.
    await waitFor(() => {
      expect(requests.map((request) => request.url)).toEqual(
        expect.arrayContaining(['/manage/spaces/7', '/manage/spaces/7/staff']),
      );
    });
    await user.click(staff);
    await waitFor(() => {
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'All staff',
        'Ahmad (you)',
        'Mona · owner',
        'Laila',
      ]);
    });
  });
});
