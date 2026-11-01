import type { OccupancyReport } from '@masaha/shared/finance';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../../test/fakeTransport';
import { stubScreenWidth } from '../../../test/screenWidth';
import { startPreferences } from '../../../test/startPreferences';
import type { FinanceLinks } from '../types/FinanceLinks';
import { FinanceScreen } from './FinanceScreen';

const LINKS: FinanceLinks = {
  customer: (id) => `/customers/${String(id)}`,
  uncollected: '/desk#uncollected',
  ledger: ({ from, to }) => `/payments?from=${from}&to=${to}`,
};

/** 24 hours, present only from 9:00 to 11:00, `peak` at 10:00. */
const hoursWith = (peak: number) =>
  Array.from({ length: 24 }, (_, hour) => (hour === 9 || hour === 11 ? 1 : hour === 10 ? peak : 0));
const ZERO = Array.from({ length: 24 }, () => 0);

function aReport(fields: Partial<OccupancyReport> = {}): OccupancyReport {
  return {
    month: '2026-10',
    averageStayMinutes: { all: 252, members: 300, visits: null },
    peakHour: 10,
    averageDailyAttendance: 12.25,
    byDay: Array.from({ length: 14 }, (_, index) => ({
      date: `2026-10-${String(index + 16).padStart(2, '0')}`,
      visits: 3,
      members: 2,
    })),
    // Present on Sunday (0) and Monday (1) only.
    byHour: Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      hours: weekday === 0 ? hoursWith(4) : weekday === 1 ? hoursWith(2) : ZERO,
    })),
    ...fields,
  };
}

function renderOccupancy(report: OccupancyReport) {
  fakeTransport(() => ok(report));
  const router = createMemoryRouter(
    [
      {
        path: '/finance',
        element: (
          <main>
            <h1>Finance</h1>
            <FinanceScreen spaceId={7} spaceName="Focus Hub" links={LINKS} />
          </main>
        ),
      },
    ],
    { initialEntries: ['/finance?tab=occupancy'] },
  );
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const heard = (element: Element) => element.textContent.replace(/[⁦-⁩]/g, '');

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-29T10:00:00.000Z'));
  startPreferences('en');
  stubScreenWidth(1280);
});

afterEach(() => {
  restoreTransport();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Finance › Occupancy', () => {
  it('shows the month’s three tiles; axe-clean', async () => {
    const { container } = renderOccupancy(aReport());

    await screen.findByRole('region', { name: 'Peak hours' });
    const tiles = [...container.querySelectorAll('[data-slot="stat-card"]')].map(heard);
    expect(tiles).toEqual([
      'Average stay4:12 hMembers 5:00 · visits — · October 2026',
      'Peak hour10:00–11:00October 2026',
      'Average daily attendance12.3October 2026',
    ]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('keeps the stay in Arabic’s own direction, the peak hour left to right', async () => {
    startPreferences('ar');
    const { container } = renderOccupancy(aReport());

    await screen.findByRole('region', { name: 'ساعات الذروة' });
    const values = [...container.querySelectorAll('[data-slot="stat-card"] dd:first-of-type')];
    // «4:12 س» reads in the page's own direction; «10:00–11:00» keeps its order in an ltr box.
    expect(values.map((value) => value.querySelector('[dir="ltr"]') !== null)).toEqual([
      false,
      true,
      true,
    ]);
    expect(heard(values[0] as Element)).toBe('4:12 س');
  });

  it('leaves out of the heatmap the weekdays and hours with no presence', async () => {
    renderOccupancy(aReport());

    const card = await screen.findByRole('region', { name: 'Peak hours' });
    const table = within(card).getByRole('table', { hidden: true });
    const headers = within(table)
      .getAllByRole('columnheader', { hidden: true })
      .map((cell) => cell.textContent);
    expect(headers).toEqual(['Day', '09', '10', '11']);
    const rows = within(table)
      .getAllByRole('rowheader', { hidden: true })
      .map((cell) => cell.textContent);
    expect(rows).toEqual(['Sunday', 'Monday']);
  });

  it('shows «—» and its line for the month’s nulls, and the heatmap’s empty state', async () => {
    const { container } = renderOccupancy(
      aReport({
        averageStayMinutes: { all: null, members: null, visits: null },
        peakHour: null,
        averageDailyAttendance: null,
        byHour: Array.from({ length: 7 }, (_, weekday) => ({ weekday, hours: ZERO })),
      }),
    );

    await screen.findByRole('region', { name: 'Peak hours' });
    const tiles = [...container.querySelectorAll('[data-slot="stat-card"]')].map(heard);
    expect(tiles).toEqual([
      'Average stay—No closed stays in October 2026',
      'Peak hour—No closed stays in October 2026',
      'Average daily attendance—No closed stays in October 2026',
    ]);
    expect(screen.getByText('No closed stays in the last 4 weeks')).toBeInTheDocument();
  });
});
