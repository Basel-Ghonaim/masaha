import { DocumentTitle, RecordTitleProvider } from '@shared/routing';
import { establishSession, restoreSession } from '@shared/session';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { aSession } from '../../../../test/fakeSession';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { publicSpace } from '../../../../test/publicSpace';
import { queryWrapper } from '../../../../test/queryWrapper';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { setSessionHint } from '../../../../test/sessionHint';
import { startPreferences } from '../../../../test/startPreferences';
import { siteRoutes } from '../../routes';

/** «Noor Hub»'s page in the site's shell, the server answering its reads. */
async function renderSpacePage() {
  fakeTransport((request) =>
    request.url === '/spaces'
      ? ok([], 200)
      : request.url === '/lookups'
        ? ok({ governorates: [], areas: [], amenities: [] })
        : request.url?.endsWith('/occupancy')
          ? ok({ status: null })
          : ok(publicSpace()),
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
  return router;
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

describe('a space’s page', () => {
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

  describe('a guest who leaves for another page', () => {
    it('lets the held report go: back on the page signed in, its dialog does not open', async () => {
      stubScreenWidth(1440);
      await becomeGuest();
      const router = await renderSpacePage();

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
