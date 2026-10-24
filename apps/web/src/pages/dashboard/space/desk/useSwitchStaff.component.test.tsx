import { createQueryClient } from '@shared/api';
import { establishSession, getSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aSession } from '../../../../test/fakeSession';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useSwitchStaff } from './useSwitchStaff';

const DESK = '/dashboard/spaces/7/desk';

/** The hook on the desk's page, beside the sign-in page; `result.current` holds its latest answer. */
function renderOnDesk() {
  const result = { current: undefined as unknown as ReturnType<typeof useSwitchStaff> };
  function Probe() {
    result.current = useSwitchStaff(7);
    return null;
  }
  const router = createMemoryRouter(
    [
      { path: DESK, element: <Probe /> },
      { path: '/login', element: <p>The sign-in page</p> },
    ],
    { initialEntries: [DESK] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { result, router };
}

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession({ spaces: [{ spaceId: 7, role: 'RECEPTION' }] }), {
    source: 'signIn',
  });
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useSwitchStaff', () => {
  it('signs out on the server, then opens sign-in with the desk as `next`', async () => {
    const requests = fakeTransport(() => ({ status: 204 }));
    const { result, router } = renderOnDesk();

    expect(result.current.label).toBe('Switch staff');
    await act(async () => {
      await result.current.run();
    });

    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'post /auth/logout',
    ]);
    expect(getSession().status).toBe('anonymous');
    await waitFor(() => {
      expect(`${router.state.location.pathname}${router.state.location.search}`).toBe(
        '/login?next=%2Fdashboard%2Fspaces%2F7%2Fdesk',
      );
    });
  });

  it('keeps the session and says so when the sign-out fails', async () => {
    fakeTransport(() => ({ failure: 'ERR_NETWORK' }));
    const { result, router } = renderOnDesk();

    await act(async () => {
      await result.current.run();
    });

    expect(getSession().status).toBe('authenticated');
    expect(router.state.location.pathname).toBe(DESK);
    await waitFor(() => {
      expect(result.current.failure).toBe('We couldn’t sign out; try again.');
    });
  });
});
