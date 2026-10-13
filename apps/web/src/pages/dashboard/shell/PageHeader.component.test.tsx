import { RecordTitleProvider, useRecordTitle, type TitledHandle } from '@shared/routing';
import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../../../test/startPreferences';
import { PageHeader } from './PageHeader';
import { PageHeaderSlot } from './PageHeaderSlot';

/** A top bar's slot, as the shell gives it, with the page's header below it. */
function Shell() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return (
    <PageHeaderSlot value={slot}>
      <header ref={setSlot} />
      <Outlet />
    </PageHeaderSlot>
  );
}

/** A page that shows a record, an English-only name, as its title. */
function RecordPage() {
  useRecordTitle({ text: 'Focus Hub', lang: 'en', dir: 'ltr' });
  return <PageHeader />;
}

/** A page with a title at `/titled`, one without at `/plain`, and a record's at `/record`. */
function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <RecordTitleProvider>
            <Shell />
          </RecordTitleProvider>
        ),
        children: [
          {
            path: '/titled',
            handle: { title: (copy) => copy.dashboard.pages.spaces } satisfies TitledHandle,
            element: <PageHeader />,
          },
          { path: '/plain', element: <PageHeader /> },
          {
            path: '/record',
            handle: { title: (copy) => copy.dashboard.pages.spaces } satisfies TitledHandle,
            element: <RecordPage />,
          },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the page's header", () => {
  it('names the page its route titles', async () => {
    renderAt('/titled');

    expect(await screen.findByRole('heading', { level: 1, name: 'Spaces' })).toBeInTheDocument();
  });

  it('never renders an empty heading: a page with no title is named by the wordmark, as its tab', async () => {
    renderAt('/plain');

    expect(await screen.findByRole('heading', { level: 1, name: 'Masaha' })).toBeInTheDocument();
  });

  it('marks a record’s name in another language with its language and direction', async () => {
    startPreferences('ar');
    renderAt('/record');

    const heading = await screen.findByRole('heading', { level: 1, name: 'Focus Hub' });
    expect(heading).toHaveAttribute('lang', 'en');
    expect(heading).toHaveAttribute('dir', 'ltr');
  });
});
