import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { OverviewPage } from './OverviewPage';

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe("the admin's overview page", () => {
  it('leads «View all» to the spaces the admin edits, stale or missing', async () => {
    startPreferences('en');
    fakeTransport(() =>
      ok({
        spaces: { verified: 1, unverified: 7, hidden: 0, unverifiedNoOwner: 7, staleOrMissing: 7 },
        reports: { open: 0, awaitingAdmin: 0, awaitingOwners: 0 },
        newUsers: 0,
        completeness: { total: 7, first: [] },
        at: '2026-10-29T10:00:00.000Z',
      }),
    );
    render(
      <QueryClientProvider client={createQueryClient()}>
        <RouterProvider router={createMemoryRouter([{ path: '/', element: <OverviewPage /> }])} />
      </QueryClientProvider>,
    );

    const card = await screen.findByRole('region', { name: 'Data completeness' });
    expect(within(card).getByRole('link', { name: 'View all (7)' })).toHaveAttribute(
      'href',
      '/dashboard/admin/spaces?status=editable&stale=true',
    );
  });
});
