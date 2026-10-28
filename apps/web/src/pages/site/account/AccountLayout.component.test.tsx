import { establishSession, restoreSession } from '@shared/session';
import { render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { reportsPage } from '../../../test/dataReport';
import { aSession } from '../../../test/fakeSession';
import { fakeTransport, ok, restoreTransport } from '../../../test/fakeTransport';
import { queryWrapper } from '../../../test/queryWrapper';
import { setSessionHint } from '../../../test/sessionHint';
import { startPreferences } from '../../../test/startPreferences';
import { siteRoutes } from '../routes';

/** The site's routes at `path`, the user's reports answered with none, any other read with nothing. */
function renderSiteAt(path: string) {
  fakeTransport((request) => (request.url === '/me/reports' ? reportsPage([]) : ok(null)));
  const router = createMemoryRouter([{ HydrateFallback: () => null, children: siteRoutes }], {
    initialEntries: [path],
  });
  const Wrapper = queryWrapper();
  const view = render(
    <Wrapper>
      <RouterProvider router={router} />
    </Wrapper>,
  );
  return { ...view, router };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  document.cookie = 'masaha_session=; Path=/; Max-Age=0';
});

describe('AccountLayout', () => {
  it('names its navigation «My account» and marks the page open as current; axe-clean', async () => {
    establishSession(aSession(), { source: 'signIn' });
    const { container } = renderSiteAt('/me/reports');

    const navigation = await screen.findByRole('navigation', { name: 'My account' });
    const current = within(navigation).getByRole('link', { name: 'My reports' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).toHaveAttribute('href', '/me/reports');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'My reports' }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('sends a guest to sign-in, carrying the page asked for', async () => {
    setSessionHint(false);
    await restoreSession();
    const { router } = renderSiteAt('/me/reports?status=open');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
    expect(new URLSearchParams(router.state.location.search).get('next')).toBe(
      '/me/reports?status=open',
    );
  });
});
