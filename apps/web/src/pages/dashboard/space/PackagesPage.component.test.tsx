import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import { PackagesPage } from './PackagesPage';

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe("the owner's packages and prices page", () => {
  it('says at its top that the desk sells the week and month prices too', async () => {
    startPreferences('en');
    fakeTransport(() => ok([]));
    const router = createMemoryRouter(
      [{ path: '/dashboard/spaces/:spaceId/packages', element: <PackagesPage /> }],
      { initialEntries: ['/dashboard/spaces/7/packages'] },
    );
    render(
      <QueryClientProvider client={createQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(
        'Week and month prices are also chosen at the desk when creating a subscription.',
      ),
    ).toBeInTheDocument();
  });
});
