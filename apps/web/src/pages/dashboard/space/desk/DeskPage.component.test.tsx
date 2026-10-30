import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { uncollectedPage, uncollectedVisit, visitTerms } from '../../../../test/deskVisit';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { DeskPage } from './DeskPage';

/** The desk's state now, with no one present. */
const NO_ONE_PRESENT = {
  status: 'AVAILABLE',
  capacity: 40,
  present: 0,
  override: null,
  people: [],
};

type Answers = { occupancy?: () => FakeAnswer; uncollected?: () => FakeAnswer };

function renderDesk({
  occupancy = () => ok(NO_ONE_PRESENT),
  uncollected = () => uncollectedPage([uncollectedVisit()]),
}: Answers = {}) {
  fakeTransport((request) => {
    const url = request.url ?? '';
    if (url.endsWith('/occupancy')) return occupancy();
    if (url.endsWith('/uncollected-visits')) return uncollected();
    if (url.endsWith('/visit-terms')) return ok(visitTerms());
    if (url.endsWith('/check-ins')) return ok([]);
    return ok({ id: 7, hours: null });
  });
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider
        router={createMemoryRouter(
          [{ path: '/dashboard/spaces/:spaceId/desk', element: <DeskPage /> }],
          { initialEntries: ['/dashboard/spaces/7/desk'] },
        )}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
});

describe('DeskPage', () => {
  it('puts the uncollected card before who is here, and hides it below xl when empty', async () => {
    const { unmount } = renderDesk();
    const uncollected = await screen.findByRole('region', { name: '1 visit not collected' });
    const present = await screen.findByRole('heading', { name: /Present now/ });
    // The DOM's order is the phone's: search, then uncollected, then who is here (K1).
    expect(
      uncollected.compareDocumentPosition(present) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(uncollected).not.toHaveClass('hidden');
    unmount();
    restoreTransport();

    renderDesk({ uncollected: () => uncollectedPage([]) });
    const empty = await screen.findByRole('region', { name: 'Not collected' });
    expect(await screen.findByText('Nothing left to collect.')).toBeInTheDocument();
    expect(empty).toHaveClass('hidden', 'xl:flex');
  });

  it('shows the offline state when who is here and the uncollected get no answer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderDesk({
      occupancy: () => ({ failure: 'ERR_NETWORK' }),
      uncollected: () => ({ failure: 'ERR_NETWORK' }),
    });
    // The transport re-sends a lost read twice, after 1 s and 2 s.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_500);
    });
    expect(await screen.findAllByText('No internet connection')).toHaveLength(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
