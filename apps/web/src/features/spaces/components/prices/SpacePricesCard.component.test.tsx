import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { NOW, SPACE } from '../../../../test/spaceFixtures';
import { startPreferences } from '../../../../test/startPreferences';
import { SpacePricesCard } from './SpacePricesCard';

/** The owner's card of space 7's prices, the server answering its read with `read`. */
function renderCard(read: () => FakeAnswer = () => ok({ ...SPACE, isVerified: true })) {
  const requests = fakeTransport(read);
  const router = createMemoryRouter(
    [
      {
        path: '/packages',
        element: <SpacePricesCard spaceId={7} editLink="/profile?sheet=prices#prices" />,
      },
    ],
    { initialEntries: ['/packages'] },
  );
  const rendered = render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...rendered, requests };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the published prices on Packages & prices', () => {
  it('shows the prices read-only, with their date, and leads to the profile’s Sheet to edit them (R1)', async () => {
    const { container, requests } = renderCard();
    const card = (
      await screen.findByRole('heading', { level: 2, name: 'Published prices' })
    ).closest('[data-slot=card]') as HTMLElement;

    expect(within(card).getByRole('table')).toHaveTextContent('Daily');
    expect(within(card).getByText('Updated 3 days ago')).toBeInTheDocument();
    expect(within(card).queryAllByRole('textbox')).toEqual([]);
    expect(within(card).queryAllByRole('combobox')).toEqual([]);
    expect(within(card).queryByRole('button', { name: 'Save' })).toBeNull();
    expect(
      within(card).getByRole('link', { name: 'Edit the prices in the space profile' }),
    ).toHaveAttribute('href', '/profile?sheet=prices#prices');
    expect(requests.map(({ url }) => url)).toEqual(['/manage/spaces/7']);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('marks stale prices so, and says when there are none', async () => {
    renderCard(() => ok({ ...SPACE, isVerified: true, staleGroups: ['prices'] }));
    expect(await screen.findByText('May be out of date')).toBeInTheDocument();
    restoreTransport();
  });

  it('says there are no prices yet when none is published', async () => {
    renderCard(() => ok({ ...SPACE, isVerified: true, prices: [] }));

    expect(await screen.findByText('No prices yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows the 404 for a space no longer the owner’s', async () => {
    renderCard(() => refused(404, { type: 'not_found' }));

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
