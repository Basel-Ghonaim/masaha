import { act, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../../../test/startPreferences';
import { DocumentTitle } from './DocumentTitle';
import type { PageTitle } from './PageTitle';
import { RecordTitleProvider } from './RecordTitleProvider';
import type { TitledHandle } from './titledHandle';
import { usePageTitle } from './usePageTitle';
import { useRecordTitle } from './useRecordTitle';

const FOCUS_HUB: PageTitle = { text: 'Focus Hub', lang: 'en', dir: 'ltr' };

/** The page's heading, as the dashboard's top bar reads the title. */
function Heading() {
  const title = usePageTitle();
  return (
    <h1 lang={title?.lang} dir={title?.dir}>
      {title?.text}
    </h1>
  );
}

/** A record's page: its name is unknown until "loaded", then given to the title. */
function RecordPage() {
  const [loaded, setLoaded] = useState(false);
  useRecordTitle(loaded ? FOCUS_HUB : undefined);
  return (
    <>
      <Heading />
      <button
        type="button"
        onClick={() => {
          setLoaded(true);
        }}
      >
        Load
      </button>
    </>
  );
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <RecordTitleProvider>
            <DocumentTitle />
            <Outlet />
          </RecordTitleProvider>
        ),
        children: [
          {
            path: '/spaces/7',
            handle: { title: (copy) => copy.dashboard.pages.spaces } satisfies TitledHandle,
            element: <RecordPage />,
          },
          {
            path: '/lookups',
            handle: { title: (copy) => copy.dashboard.pages.lookups } satisfies TitledHandle,
            element: <Heading />,
          },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  startPreferences('en');
  document.title = '';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a page titled by its record's name", () => {
  it('shows its route’s title while the record loads', async () => {
    renderAt('/spaces/7');

    expect(await screen.findByRole('heading', { name: 'Spaces' })).toBeInTheDocument();
    expect(document.title).toBe('Spaces · Masaha');
  });

  it('shows the record’s name, in its own language, in the heading and the tab once given', async () => {
    renderAt('/spaces/7');
    await screen.findByRole('heading', { name: 'Spaces' });

    act(() => {
      screen.getByRole('button', { name: 'Load' }).click();
    });

    const heading = await screen.findByRole('heading', { name: 'Focus Hub' });
    expect(heading).toHaveAttribute('lang', 'en');
    expect(heading).toHaveAttribute('dir', 'ltr');
    expect(document.title).toBe('Focus Hub · Masaha');
  });

  it('lets the next page’s title show once the record’s page has gone', async () => {
    const router = renderAt('/spaces/7');
    await screen.findByRole('heading', { name: 'Spaces' });
    act(() => {
      screen.getByRole('button', { name: 'Load' }).click();
    });
    await screen.findByRole('heading', { name: 'Focus Hub' });

    await act(() => router.navigate('/lookups'));

    await waitFor(() => {
      expect(document.title).toBe('Lookups · Masaha');
    });
    expect(screen.getByRole('heading', { name: 'Lookups' })).toBeInTheDocument();
  });
});
