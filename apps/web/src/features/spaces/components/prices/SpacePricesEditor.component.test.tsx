import type { AdminSpace } from '@masaha/shared/spaces';
import { createQueryClient } from '@shared/api';
import { Toaster } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { SpacePricesEditor } from './SpacePricesEditor';

/** The owner's verified space, its prices dated, with no saved shift. */
const SPACE: AdminSpace = {
  id: 7,
  slug: 'focus-hub',
  nameEn: 'Focus Hub',
  nameAr: 'فوكس هب',
  descriptionAr: null,
  descriptionEn: null,
  areaId: 11,
  addressAr: 'شارع النصر',
  addressEn: null,
  landmarkAr: null,
  landmarkEn: null,
  location: { lat: 31.5195, lng: 34.447 },
  isHidden: false,
  isVerified: true,
  owners: [{ id: 5, name: 'Rima' }],
  updatedAt: {
    profile: '2026-10-10T08:00:00Z',
    hours: null,
    prices: '2026-10-10T08:00:00Z',
    amenities: null,
    contacts: null,
  },
  staleGroups: [],
  missingGroups: ['hours', 'amenities', 'contacts'],
  hours: null,
  prices: [],
  amenityIds: [],
  ownAmenities: [],
  contacts: [],
};

/** The prices of space 7 at `/packages`, beside another page, `/elsewhere`. */
function renderPrices() {
  const requests = fakeTransport(() => ok(SPACE));
  const router = createMemoryRouter(
    [
      { path: '/packages', element: <SpacePricesEditor spaceId={7} hoursLink="/profile#hours" /> },
      { path: '/elsewhere', element: <p>Elsewhere</p> },
    ],
    { initialEntries: ['/packages'] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <Toaster label="Notifications" closeLabel="Close notification" />
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, requests };
}

/** The prices' card, by its heading. */
const card = async (name: string) =>
  (await screen.findByRole('heading', { level: 2, name })).closest<HTMLElement>('#prices');

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('SpacePricesEditor', () => {
  it('titles the prices «الأسعار المعلنة» with its own intro, read from the managed route', async () => {
    startPreferences('ar');
    const { requests } = renderPrices();

    const prices = await card('الأسعار المعلنة');
    expect(prices).not.toBeNull();
    expect(
      within(prices as HTMLElement).getByText(
        'تظهر في صفحة المساحة · للعرض فقط · الدفع في المساحة',
      ),
    ).toBeInTheDocument();
    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'get /manage/spaces/7',
    ]);
  });

  it('asks before the page is left with unsaved prices, naming them', async () => {
    const user = userEvent.setup();
    const { router } = renderPrices();
    const prices = await card('Published prices');
    await user.click(within(prices as HTMLElement).getByRole('button', { name: 'Add price' }));

    await act(() => router.navigate('/elsewhere'));

    const dialog = await screen.findByRole('alertdialog', { name: 'Leave with unsaved changes?' });
    expect(dialog).toHaveTextContent('Unsaved changes in Published prices will be lost.');
    await user.click(within(dialog).getByRole('button', { name: 'Stay' }));
    expect(router.state.location.pathname).toBe('/packages');
  });

  it('leads from the line for a space with no shift to the opening hours', async () => {
    renderPrices();
    const prices = await card('Published prices');

    await waitFor(() => {
      expect(
        within(prices as HTMLElement).getByRole('link', {
          name: 'Add shifts in the opening hours',
        }),
      ).toHaveAttribute('href', '/profile#hours');
    });
    expect(
      within(prices as HTMLElement).getByText(/No saved shifts — add shifts first\./),
    ).toBeInTheDocument();
  });
});
