import type { SpaceReport } from '@masaha/shared/data-reports';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { reportsPage, spaceReport } from '../../../../test/dataReport';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { findToast } from '../../../../test/findToast';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { SpaceReportsList } from './SpaceReportsList';

const DECIDED: SpaceReport = spaceReport({
  status: 'RESOLVED',
  decision: { status: 'RESOLVED', at: '2026-10-27T09:00:00.000Z', note: null, repliedBy: 'SPACE' },
});

/** The owner's list of space 7 at `/reports` with `search`, every field edited on the profile. */
function renderList(answer: Parameters<typeof fakeTransport>[0], search = '') {
  const requests = fakeTransport(answer);
  const router = createMemoryRouter(
    [
      {
        path: '/reports',
        element: (
          <>
            <SpaceReportsList spaceId={7} fieldLink={(field) => `/profile#${field}`} />
            <Toaster label="Notifications" />
          </>
        ),
      },
    ],
    { initialEntries: [`/reports${search}`] },
  );
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...view, router, requests };
}

beforeEach(() => {
  startPreferences('en');
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-28T09:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('SpaceReportsList', () => {
  it('shows a table of five columns from 768 px; axe-clean', async () => {
    stubScreenWidth(768);
    const { container } = renderList(() => reportsPage([spaceReport()]));

    await screen.findByText('The space opens at 9, not 8.');
    const table = screen.getByRole('table', { name: 'Data reports' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Field', 'Report', 'Date', 'Status', 'Actions']);
    const [, row] = within(table).getAllByRole('row');
    expect(
      within(row as HTMLElement)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['Opening hours', 'The space opens at 9, not 8.', '21 October', 'New', 'Open']);
    const chips = screen.getByRole('radiogroup', { name: 'Filter by status' });
    expect(within(chips).getByRole('radio', { name: 'All' })).toBeChecked();
    expect(screen.getByText('1 report')).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows a card each at 390 px, «A visitor» and the day on it', async () => {
    stubScreenWidth(390);
    renderList(() => reportsPage([spaceReport()]));

    await screen.findByText('The space opens at 9, not 8.');
    const cards = screen.getByRole('list', { name: 'Data reports' });
    expect(screen.queryByRole('table')).toBeNull();
    const [card] = within(cards).getAllByRole('listitem');
    expect(within(card as HTMLElement).getByText('A visitor · 21 October')).toBeVisible();
    expect(within(card as HTMLElement).getByText('New')).toBeVisible();
    expect(within(card as HTMLElement).getByRole('button', { name: 'Open' })).toBeVisible();
  });

  it('decides a new report: it leaves «New», the toast says where it went, the focus on the count', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    let decided = false;
    // The list read after the decision waits until released, so the sheet has closed by then.
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { router, requests } = renderList(async (request): Promise<FakeAnswer> => {
      if (request.method === 'patch') {
        decided = true;
        return ok(DECIDED);
      }
      if (decided) await held;
      const status = (request.params as { status?: string }).status;
      if (status === 'OPEN') return reportsPage(decided ? [] : [spaceReport()]);
      return reportsPage([decided ? DECIDED : spaceReport()]);
    }, '?status=open');

    await user.click(await screen.findByRole('button', { name: 'Open' }));
    const sheet = await screen.findByRole('dialog', { name: 'Report about Opening hours' });
    expect(within(sheet).getByRole('link', { name: 'Edit the field' })).toHaveAttribute(
      'href',
      '/profile#HOURS',
    );
    await user.click(within(sheet).getByRole('button', { name: 'Corrected' }));

    const shown = await findToast('Marked “Corrected”');
    expect(within(shown.closest('li') as HTMLElement).getByText('In “Reviewed”')).toBeVisible();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    // The sheet gives the focus back to «Open», its row still shown until the list is read again.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
    });

    release();
    expect(await screen.findByText('No reports match the filters')).toBeVisible();
    await waitFor(() => {
      expect(screen.getByText('0 reports')).toHaveFocus();
    });
    expect(requests.filter(({ method }) => method === 'patch')).toHaveLength(1);

    // Sonner's swipe needs pointer capture, which jsdom lacks: the action is pressed by its key.
    within(shown.closest('li') as HTMLElement)
      .getByRole('button', { name: 'Show' })
      .focus();
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(router.state.location.search).toBe('?status=decided');
    });
    expect(await screen.findByText('Corrected')).toBeVisible();
  });

  describe('a report decided elsewhere, met under «New»', () => {
    const ELSEWHERE: SpaceReport = spaceReport({
      status: 'DISMISSED',
      decision: {
        status: 'DISMISSED',
        at: '2026-10-27T09:00:00.000Z',
        note: 'Our hours are right',
        repliedBy: 'SPACE',
      },
    });

    /** Under «New», the decision refused as already made; the first page of «All» then `all`. */
    async function decideElsewhere(all: () => SpaceReport[]) {
      stubScreenWidth(1440);
      const user = userEvent.setup();
      let refusedOnce = false;
      renderList((request) => {
        if (request.method === 'patch') {
          refusedOnce = true;
          return refused(409, { type: 'conflict', code: 'REPORT_ALREADY_DECIDED' });
        }
        const status = (request.params as { status?: string }).status;
        if (status === 'OPEN') return reportsPage(refusedOnce ? [] : [spaceReport()]);
        return reportsPage(refusedOnce ? all() : [spaceReport()]);
      }, '?status=open');

      await user.click(await screen.findByRole('button', { name: 'Open' }));
      const sheet = await screen.findByRole('dialog', { name: 'Report about Opening hours' });
      await user.click(within(sheet).getByRole('button', { name: 'Corrected' }));
      expect(await within(sheet).findByRole('alert')).toBeInTheDocument();
      return sheet;
    }

    it('shows its decision, read from «All», never the stale «New»', async () => {
      const sheet = await decideElsewhere(() => [ELSEWHERE]);

      expect(await within(sheet).findByText('Not accepted')).toBeVisible();
      expect(within(sheet).getByText(/Our hours are right/)).toBeVisible();
      expect(within(sheet).queryByText('New')).toBeNull();
      expect(within(sheet).queryByRole('button', { name: 'Corrected' })).toBeNull();
    });

    it('says it was reviewed when the first page of «All» does not hold it, never the stale «New»', async () => {
      const sheet = await decideElsewhere(() => []);

      expect(await within(sheet).findByText('Reviewed')).toBeVisible();
      expect(within(sheet).queryByText('New')).toBeNull();
    });
  });

  it('gives the focus back to «Open» when the sheet is closed', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    renderList(() => reportsPage([spaceReport()]));

    const open = await screen.findByRole('button', { name: 'Open' });
    await user.click(open);
    const sheet = await screen.findByRole('dialog');
    await user.click(within(sheet).getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(open).toHaveFocus();
    });
  });
});
