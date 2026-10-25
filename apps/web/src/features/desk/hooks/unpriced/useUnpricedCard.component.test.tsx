import type { DeskVisit } from '@masaha/shared/visits';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deskVisit } from '../../../../test/deskVisit';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { UnpricedCard } from '../../components/unpriced/UnpricedCard';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

/** «Layla»'s visit, closed unpriced at the desk on 6 October. */
const LAYLA = deskVisit({
  id: 8,
  visitorName: 'Layla',
  hourRateAgorot: null,
  dayRateAgorot: null,
  checkedInAt: '2026-10-06T11:00:00.000Z',
  checkedOutAt: '2026-10-06T13:00:00.000Z',
  checkoutMethod: 'MANUAL',
});

function page(rows: DeskVisit[]) {
  return {
    status: 200,
    data: {
      success: true,
      data: rows,
      meta: {
        currentPage: 1,
        limit: 20,
        totalPages: rows.length === 0 ? 0 : 1,
        totalRecords: rows.length,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  };
}

function renderCard(mayTypePrice: boolean, rows: DeskVisit[] = [LAYLA]) {
  const requests = fakeTransport(() => page(rows));
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/desk']}>
        <UnpricedCard spaceId={7} mayTypePrice={mayTypePrice} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return requests;
}

beforeEach(() => {
  startPreferences('en');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-08T09:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
});

describe('useUnpricedCard', () => {
  it('lists the unpriced visits for whoever may type a price, each with «Set the price»', async () => {
    const requests = renderCard(true);

    expect(
      await screen.findByRole('region', { name: '1 visit without a price' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Layla')).toBeInTheDocument();
    expect(screen.getByText(heard('Checked out by hand · 6 Oct 14:00–16:00'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set the price' })).toBeVisible();
    expect(requests[0]?.url).toBe('/manage/spaces/7/unpriced-visits');
  });

  it('reads nothing, and shows nothing, for whoever may not type a price', async () => {
    const requests = renderCard(false);

    // Long enough for a query that would read to have sent its request.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(screen.queryByRole('region')).toBeNull();
    expect(requests).toHaveLength(0);
  });

  it('is absent with no unpriced visit', async () => {
    const requests = renderCard(true, []);

    await vi.waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(screen.queryByRole('region')).toBeNull();
  });
});
