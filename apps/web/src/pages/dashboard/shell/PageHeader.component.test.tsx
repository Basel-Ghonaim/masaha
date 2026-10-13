import type { TitledHandle } from '@shared/routing';
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

/** A page with a title at `/titled`, and one without at `/plain`. */
function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <Shell />,
        children: [
          {
            path: '/titled',
            handle: { title: (copy) => copy.dashboard.pages.spaces } satisfies TitledHandle,
            element: <PageHeader />,
          },
          { path: '/plain', element: <PageHeader /> },
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
});
