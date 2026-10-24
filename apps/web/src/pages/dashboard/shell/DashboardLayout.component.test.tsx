import { useActionBarShown } from '@shared/routing';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubScreenWidth } from '../../../test/screenWidth';
import { startPreferences } from '../../../test/startPreferences';
import { DashboardLayout } from './DashboardLayout';
import { PageActionBar } from './PageActionBar';

/** Whether the bottom bar is shown, as the app's Toaster reads it. */
function BarProbe() {
  return <p>{useActionBarShown() ? 'Bar shown' : 'No bar'}</p>;
}

/** The shell around a page with its one action at `/desk`, and a page with none at `/plain`. */
function renderShell(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <DashboardLayout label="Space dashboard" header={null}>
            {null}
          </DashboardLayout>
        ),
        children: [
          {
            path: '/desk',
            element: (
              <PageActionBar>
                <button type="button">Check in a visit</button>
              </PageActionBar>
            ),
          },
          { path: '/plain', element: <p>A page</p> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <>
      <RouterProvider router={router} />
      <BarProbe />
    </>,
  );
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the dashboard's bottom action bar", () => {
  it('below 768 px a page’s action stands in the bottom bar and the content makes room for it; from 768 px there is no bar; a page with no action has none', async () => {
    stubScreenWidth(390);
    renderShell('/desk');

    const action = await screen.findByRole('button', { name: 'Check in a visit' });
    const bar = action.closest('[data-slot="page-action-bar"]');
    expect(bar).not.toBeNull();
    expect(bar).toBeVisible();
    expect(screen.getByRole('main')).not.toContainElement(action);
    expect(screen.getByRole('main')).toHaveClass('pb-24');
    expect(screen.getByText('Bar shown')).toBeInTheDocument();
  });

  it('draws no bar from 768 px', async () => {
    stubScreenWidth(1280);
    renderShell('/desk');

    expect(await screen.findByText('No bar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check in a visit' })).toBeNull();
    expect(screen.getByRole('main')).not.toHaveClass('pb-24');
  });

  it('draws no bar for a page with no action', async () => {
    stubScreenWidth(390);
    renderShell('/plain');

    expect(await screen.findByText('A page')).toBeInTheDocument();
    expect(screen.getByText('No bar')).toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveClass('pb-24');
    const bar = document.querySelector('[data-slot="page-action-bar"]');
    expect(bar).not.toBeNull();
    expect(bar).not.toBeVisible();
  });
});
