import type { IncomeReport } from '@masaha/shared/finance';
import { createQueryClient } from '@shared/api';
import { Toaster } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { findToast } from '../../../test/findToast';
import { fakeTransport, ok, restoreTransport } from '../../../test/fakeTransport';
import { stubScreenWidth } from '../../../test/screenWidth';
import { startPreferences } from '../../../test/startPreferences';
import type { FinanceLinks } from '../types/FinanceLinks';
import { FinanceExport } from './FinanceExport';
import { FinanceScreen } from './FinanceScreen';

const LINKS: FinanceLinks = {
  customer: (id) => `/customers/${String(id)}`,
  uncollected: '/desk#uncollected',
  ledger: ({ from, to }) => `/payments?from=${from}&to=${to}`,
};

const split = (subscriptionsAgorot: number, visitsAgorot: number) => ({
  subscriptionsAgorot,
  visitsAgorot,
  totalAgorot: subscriptionsAgorot + visitsAgorot,
});

/** October 2026's income, read on 29 October; `month` the month answered. */
function aReport(month = '2026-10', fields: Partial<IncomeReport> = {}): IncomeReport {
  return {
    month,
    income: split(100_000, 12_000),
    previousMonth: split(90_000, 10_000),
    today: split(0, 4_500),
    allTime: { ...split(900_000, 80_000), since: '2025-03-14' },
    months: Array.from({ length: 12 }, (_, index) => ({
      month: `${String(index < 2 ? 2025 : 2026)}-${String(((index + 10) % 12) + 1).padStart(2, '0')}`,
      income: split(10_000 * index, 1_000),
    })),
    visitsByDay: Array.from({ length: 30 }, (_, index) => ({
      date: `2026-10-${String(index + 1).padStart(2, '0')}`,
      agorot: 500,
    })),
    collections: [
      {
        recordedBy: { id: 4, name: 'Mona' },
        count: 12,
        totalAgorot: 60_000,
        byMethod: { CASH: 50_000, TRANSFER: 10_000 },
      },
    ],
    ...fields,
  };
}

function renderFinance(answer: Parameters<typeof fakeTransport>[0], path = '/finance') {
  const requests = fakeTransport(answer);
  const router = createMemoryRouter(
    [
      {
        path: '/finance',
        element: (
          <main>
            <h1>Finance</h1>
            <FinanceExport spaceId={7} />
            <FinanceScreen spaceId={7} spaceName="Focus Hub" links={LINKS} />
          </main>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
      <Toaster label="Notifications" closeLabel="Close notification" />
    </QueryClientProvider>,
  );
  return { ...view, requests, router };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  // Thursday 29 October 2026, 12:00 in Gaza.
  vi.setSystemTime(new Date('2026-10-29T10:00:00.000Z'));
  startPreferences('en');
  stubScreenWidth(1280);
});

afterEach(() => {
  restoreTransport();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A tile's text, the isolates around its values removed, as a reader hears it. */
const heard = (element: Element) => element.textContent.replace(/[⁦-⁩]/g, '');

describe('Finance › Income', () => {
  it('shows the three tiles, the two charts and the collections table; axe-clean', async () => {
    const { container, requests } = renderFinance(() => ok(aReport()));

    await screen.findByText('Income = amounts actually collected, excluding voided payments.');
    expect(requests[0]?.url).toBe('/manage/spaces/7/finance/income');
    expect(requests[0]?.params).toBeUndefined();
    const tiles = [...container.querySelectorAll('[data-slot="stat-card"]')].map(heard);
    expect(tiles).toEqual([
      'Today₪45Up to 12:00',
      'October 2026₪1,120+12% vs September 2026',
      'All time₪9,800Since March 2025',
    ]);
    expect(screen.getByRole('region', { name: 'Income by month' })).toHaveTextContent(
      'Last 12 months',
    );
    expect(screen.getByRole('region', { name: 'Visit income per day' })).toHaveTextContent(
      'Last 30 days',
    );
    const table = screen.getByRole('table', { name: 'Collections by staff member' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Staff', 'Count', 'Total', 'Cash', 'Transfer']);
    expect(within(table).getByRole('row', { name: /Mona/ })).toHaveTextContent(
      'Mona12₪600₪500₪100',
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says no change when the month before had no income, and no payments yet', async () => {
    const { container } = renderFinance(() =>
      ok(
        aReport('2026-10', {
          previousMonth: split(0, 0),
          allTime: { ...split(0, 0), since: null },
          collections: [],
        }),
      ),
    );

    await screen.findByText('No payments yet');
    const tiles = [...container.querySelectorAll('[data-slot="stat-card"]')].map(heard);
    expect(tiles[1]).toBe('October 2026₪1,120');
    expect(screen.getByText('No collections this month.')).toBeInTheDocument();
  });

  it('reads the month chosen into the address, its tile named by it', async () => {
    const { requests, router } = renderFinance((request) =>
      ok(
        aReport(
          typeof request.params === 'object'
            ? (request.params as { month: string }).month
            : '2026-10',
        ),
      ),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await screen.findByText('October 2026');
    await user.click(screen.getByRole('combobox', { name: 'Month' }));
    await user.click(screen.getByRole('option', { name: 'August 2026' }));

    expect(router.state.location.search).toBe('?month=2026-08');
    expect(await screen.findByText('August 2026', { selector: 'dt' })).toBeInTheDocument();
    expect(requests.at(-1)?.params).toEqual({ month: '2026-08' });
    // The charts keep their fixed windows, named so.
    expect(screen.getByRole('region', { name: 'Income by month' })).toHaveTextContent(
      'Last 12 months',
    );
  });

  it('downloads the income CSV and says «File downloaded»', async () => {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:masaha/1');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const saved: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      saved.push(this.download);
    });
    renderFinance(() => ok(aReport()));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    const button = await screen.findByRole('button', { name: 'Export income (CSV)' });
    await screen.findByText('October 2026', { selector: 'dt' });
    await user.click(button);

    expect(saved).toEqual(['masaha-income-2026-10.csv']);
    expect(await findToast('File downloaded')).toBeInTheDocument();
    expect(screen.getByText('masaha-income-2026-10.csv')).toBeInTheDocument();
  });
});
