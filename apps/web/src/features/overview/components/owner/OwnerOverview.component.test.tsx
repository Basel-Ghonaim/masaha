import type { OwnerOverview as Overview } from '@masaha/shared/overview';
import { createQueryClient } from '@shared/api';
import type { Language } from '@shared/copy';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import type { OwnerOverviewLinks } from '../../types/OwnerOverviewLinks';
import { OwnerOverview } from './OwnerOverview';

const LINKS: OwnerOverviewLinks = {
  group: (group) => (group === 'prices' ? '/packages#prices' : `/profile#${group}`),
  reports: '/reports?status=open',
  desk: '/desk#uncollected',
  deskUnpriced: '/desk#unpriced',
  debts: '/finance?tab=debts',
  announcements: '/announcements',
  capacity: '/settings#attendance',
  presentNow: '/desk',
  endingAll: '/customers?status=ENDING_SOON',
  customer: (id) => `/customers/${String(id)}`,
};

/** Read on Thursday 29 October 2026 at noon, Gaza time. */
const AT = '2026-10-29T10:00:00.000Z';

const ending = (id: number, endsOn: string | null) => ({
  customer: { id, name: `Customer ${String(id)}` },
  subscription: { id: 100 + id, name: 'Monthly', endsOn },
});

/** A space with something in every row of the work queue. */
function anOverview(fields: Partial<Overview> = {}): Overview {
  return {
    attention: {
      groups: { missing: ['hours'], stale: [{ group: 'prices', days: 2 }] },
      openReports: 3,
      uncollectedVisits: 2,
      unpricedVisits: 1,
      closuresAwaitingExtension: 1,
      capacitySet: false,
      customersOwing: 4,
    },
    presentNow: { visits: 3, members: 2, total: 5, capacity: 40, status: 'AVAILABLE' },
    endingSoon: { total: 6, first: [ending(1, '2026-10-30'), ending(2, '2026-11-02')] },
    announcements: { running: 2, types: ['CLOSURE', 'OFFER'] },
    at: AT,
    ...fields,
  };
}

/** Nothing waiting on the owner. */
const ALL_CLEAR: Overview['attention'] = {
  groups: { missing: [], stale: [] },
  openReports: 0,
  uncollectedVisits: 0,
  unpricedVisits: 0,
  closuresAwaitingExtension: 0,
  capacitySet: true,
  customersOwing: 0,
};

function renderOverview(answer: Parameters<typeof fakeTransport>[0], language: Language = 'en') {
  startPreferences(language);
  const requests = fakeTransport(answer);
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <main>
          <h1>Overview</h1>
          <OwnerOverview spaceId={7} links={LINKS} />
        </main>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, requests };
}

/** An element's text with the isolates around its inserted values removed, as a reader hears it. */
const heard = (element: Element | undefined) => element?.textContent.replace(/[⁦-⁩]/g, '') ?? '';

/** The work queue's rows, each its text and its link's address. */
async function attentionRows() {
  const card = await screen.findByRole('region', { name: 'Needs your attention' });
  return within(card)
    .getAllByRole('listitem')
    .map((row) => [row.textContent, within(row).getByRole('link').getAttribute('href')]);
}

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('OwnerOverview', () => {
  it('shows no amount anywhere; axe-clean', async () => {
    const { container, requests } = renderOverview(() => ok(anOverview()));

    await screen.findByRole('region', { name: 'Needs your attention' });
    expect(requests[0]?.url).toBe('/manage/spaces/7/overview');
    expect(container.textContent).not.toMatch(/₪|ILS|agorot/i);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('lists the attention rows in order, each with its link', async () => {
    renderOverview(() => ok(anOverview()));

    expect(await attentionRows()).toEqual([
      [
        'Opening hoursNot added yetThis section was never saved, so visitors don’t see it.Review',
        '/profile#hours',
      ],
      ['PricesOut of dateUpdated 2 days agoReview', '/packages#prices'],
      ['3 new reportsFrom visitors, about facts on the space pageReview', '/reports?status=open'],
      [
        '2 visits not collectedLeft without paying, or checked out automaticallyOpen the desk',
        '/desk#uncollected',
      ],
      [
        '1 visit with no priceClosed with no price; set it at the desk.Open the desk',
        '/desk#unpriced',
      ],
      ['4 customers owe moneyThe amounts are in Finance › DebtsView', '/finance?tab=debts'],
      [
        '1 closure whose subscriptions are not extendedExtend the subscriptions it covered, once.Review',
        '/announcements',
      ],
      [
        'Capacity is not setWithout it visitors see no live status.Set the capacity',
        '/settings#attendance',
      ],
    ]);
  });

  it('says a stale group’s days with the right plural (2 → «قبل يومين»)', async () => {
    renderOverview(() => ok(anOverview()), 'ar');

    const card = await screen.findByRole('region', { name: 'يحتاج انتباهك' });
    expect(within(card).getByText('آخر تحديث قبل يومين')).toBeInTheDocument();
  });

  it('says «كل شيء على ما يرام» with nothing to attend', async () => {
    renderOverview(() => ok(anOverview({ attention: ALL_CLEAR })));

    const card = await screen.findByRole('region', { name: 'Needs your attention' });
    expect(within(card).queryAllByRole('listitem')).toHaveLength(0);
    expect(within(card).getByText('All is in order')).toBeInTheDocument();
  });

  it('shows the meter and the ratio only with a capacity', async () => {
    renderOverview(() => ok(anOverview()));

    const present = await screen.findByRole('region', { name: 'Present now' });
    expect(within(present).getByText('5 / 40')).toBeInTheDocument();
    expect(within(present).getByRole('meter', { name: 'Occupancy' })).toHaveAttribute(
      'aria-valuetext',
      '5 of 40',
    );
    expect(within(present).getByText('Now: 2 subscribers and 3 visits')).toBeInTheDocument();
    expect(within(present).getByText('Visitors never see capacity, only the state.')).toBeVisible();
  });

  it('shows no meter, and asks for the capacity, without one', async () => {
    renderOverview(() =>
      ok(
        anOverview({
          presentNow: { visits: 1, members: 0, total: 1, capacity: null, status: null },
        }),
      ),
    );

    const present = await screen.findByRole('region', { name: 'Present now' });
    expect(within(present).queryByRole('meter')).toBeNull();
    expect(within(present).getByText('1')).toBeInTheDocument();
    expect(within(present).getByText('No live status')).toBeInTheDocument();
    expect(
      within(present).getByText('Set the capacity in Settings for a live status.'),
    ).toBeInTheDocument();
  });

  it('lists five ending soon, «Ends tomorrow», and «View all»', async () => {
    const first = [
      ending(1, '2026-10-30'),
      ending(2, '2026-11-02'),
      ending(3, '2026-10-29'),
      ending(4, null),
      ending(5, '2026-11-01'),
      ending(6, '2026-11-03'),
    ];
    renderOverview(() => ok(anOverview({ endingSoon: { total: 6, first } })));

    const card = await screen.findByRole('region', { name: 'Subscriptions ending this week' });
    const rows = within(card).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    expect(heard(rows[0])).toBe('Customer 1Monthly · Ends tomorrowRenew');
    expect(rows[1]).toHaveTextContent('Ends in 4 days');
    expect(rows[2]).toHaveTextContent('Ends today');
    expect(rows[3]).toHaveTextContent(/^Customer 4Renew$/);
    const [firstRow] = rows;
    expect(
      within(firstRow as HTMLElement).getByRole('link', { name: 'Customer 1' }),
    ).toHaveAttribute('href', '/customers/1');
    expect(within(card).getByText('6 subscriptions')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'View all' })).toHaveAttribute(
      'href',
      '/customers?status=ENDING_SOON',
    );
  });

  it('links the announcements’ tile, with the running types', async () => {
    renderOverview(() => ok(anOverview()));

    const tile = await screen.findByRole('link', { name: /Active announcements/ });
    expect(tile).toHaveAttribute('href', '/announcements');
    expect(heard(tile)).toContain('Temporary closure, Offer');
  });

  it('offers «Try again» on a failure, which reads the overview again', async () => {
    let failing = true;
    const { requests } = renderOverview(() =>
      failing ? refused(403, { type: 'forbidden' }) : ok(anOverview()),
    );

    const retry = await screen.findByRole('button', { name: 'Try again' });
    expect(screen.getByText('Couldn’t load the overview')).toBeInTheDocument();
    failing = false;
    await userEvent.click(retry);

    expect(await screen.findByRole('region', { name: 'Needs your attention' })).toBeInTheDocument();
    expect(requests).toHaveLength(2);
  });
});
