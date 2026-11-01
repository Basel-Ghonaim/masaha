import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { deskCheckIn, subscriptionState } from '../../../../test/deskCustomer';
import { deskVisit } from '../../../../test/deskVisit';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { DeskLog } from './DeskLog';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

// 11:00 in Gaza (UTC+2, its summer time over) on 25 October 2026.
const NOW = new Date('2026-10-25T09:00:00.000Z');

const page = (rows: unknown[]) => ({
  status: 200,
  data: {
    success: true,
    data: rows,
    meta: {
      currentPage: 1,
      limit: 50,
      totalPages: rows.length === 0 ? 0 : 1,
      totalRecords: rows.length,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  },
});

const OMAR = deskVisit({
  id: 12,
  visitorName: 'Omar',
  audience: 'STUDENT',
  checkedInAt: '2026-10-25T06:00:00.000Z',
  checkedOutAt: '2026-10-25T07:35:00.000Z',
  checkoutMethod: 'AUTO',
  writeOff: { at: '2026-10-25T08:00:00.000Z', byId: 2, reason: 'Left' },
});
const SARA = deskCheckIn({
  id: 3,
  checkedInAt: '2026-10-25T07:30:00.000Z',
  subscription: subscriptionState({ name: 'Monthly' }),
});

function renderLog({
  owner = true,
  path = '/desk?view=log',
  visits = [OMAR],
  checkIns = [SARA],
}: { owner?: boolean; path?: string; visits?: unknown[]; checkIns?: unknown[] } = {}) {
  const requests = fakeTransport((request) =>
    request.url?.endsWith('/visits') === true ? page(visits) : page(checkIns),
  );
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <main>
          <DeskLog spaceId={7} owner={owner} fileLink={(id) => `/file/${String(id)}`} />
        </main>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { requests, ...view };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  startPreferences('en');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  restoreTransport();
});

describe('DeskLog', () => {
  it('reads the owner’s chosen day; reception reads today with no picker and no range', async () => {
    stubScreenWidth(1440);
    const owner = renderLog({ path: '/desk?view=log&logDay=2026-10-20' });
    expect(await screen.findByRole('button', { name: /Day/ })).toHaveTextContent('20 October');
    expect(owner.requests.map((request): unknown[] => [request.url, request.params])).toEqual(
      expect.arrayContaining([
        ['/manage/spaces/7/visits', { from: '2026-10-20', to: '2026-10-20', page: 1, limit: 50 }],
        [
          '/manage/spaces/7/check-ins',
          { from: '2026-10-20', to: '2026-10-20', page: 1, limit: 50 },
        ],
      ]),
    );
    owner.unmount();
    restoreTransport();

    const reception = renderLog({ owner: false, path: '/desk?view=log&logDay=2026-10-20' });
    expect(await screen.findByText('Today')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Day/ })).toBeNull();
    await screen.findByRole('table', { name: 'The day’s log' });
    expect(reception.requests.map((request): unknown[] => [request.url, request.params])).toEqual(
      expect.arrayContaining([
        ['/manage/spaces/7/visits', { page: 1, limit: 50 }],
        [
          '/manage/spaces/7/check-ins',
          { from: '2026-10-25', to: '2026-10-25', page: 1, limit: 50 },
        ],
      ]),
    );
  });

  it('names each row’s kind, times, stay and how it ended, the latest first; axe-clean', async () => {
    stubScreenWidth(1440);
    const { container } = renderLog();

    const table = await screen.findByRole('table', { name: 'The day’s log' });
    await within(table).findByRole('link', { name: 'Sara Khalid' });
    const rows = within(table).getAllByRole('row');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Name', 'Type', 'In', 'Out', 'Duration', 'Ended']);
    const [sara, omar] = rows.slice(1).map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent.replace(/[⁦-⁩]/g, '')),
    );
    expect(sara).toEqual(['Sara Khalid', 'Monthly', '09:30', '—', '1:30', '']);
    expect(omar).toEqual([
      'Omar',
      'Visit · studentWritten off',
      '08:00',
      '09:35',
      '1:35',
      'Automatic',
    ]);
    expect(within(table).getByRole('link', { name: 'Sara Khalid' })).toHaveAttribute(
      'href',
      '/file/4',
    );
    expect(screen.getByText(heard('Showing 1–2 of 2'))).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says «No one came on this day» for an empty day', async () => {
    renderLog({ visits: [], checkIns: [] });
    expect(await screen.findByText('No one came on this day')).toBeVisible();
  });

  it('lets the owner choose an earlier day, never a later one', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    renderLog();
    await user.click(await screen.findByRole('button', { name: /Day/ }));
    expect(screen.getByRole('button', { name: /October 26th/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /October 24th/ }));
    expect(await screen.findByRole('button', { name: /Day/ })).toHaveTextContent('24 October');
  });
});
