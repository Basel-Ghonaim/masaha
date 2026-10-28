import { createQueryClient } from '@shared/api';
import { Field, Input } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { adminReport, reportsPage } from '../../../../test/dataReport';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import type { AdminSpaceFilterSlot } from '../../types/AdminSpaceFilterSlot';
import { AdminReportsList } from './AdminReportsList';

/** The page's space filter, as a plain field: `space-links`' search is its own test's. */
const spaceFilter: AdminSpaceFilterSlot = ({ label, value }) => (
  <Field label={label}>
    <Input readOnly value={value === undefined ? '' : String(value)} />
  </Field>
);

/** The admin's list at `/reports` with `search`, each space's editor at `/spaces/:id`. */
function renderList(
  search = '',
  answer: Parameters<typeof fakeTransport>[0] = () => reportsPage([adminReport()]),
) {
  fakeTransport(answer);
  const router = createMemoryRouter(
    [
      {
        path: '/reports',
        element: (
          <AdminReportsList
            spaceFilter={spaceFilter}
            editorLink={(spaceId) => `/spaces/${String(spaceId)}`}
          />
        ),
      },
    ],
    { initialEntries: [`/reports${search}`] },
  );
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
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
});

describe('AdminReportsList', () => {
  it('shows a table of eight columns from 1024 px, the filters in a row; axe-clean', async () => {
    stubScreenWidth(1024);
    const { container } = renderList('?field=HOURS');

    await screen.findByText('The space opens at 9, not 8.');
    const table = screen.getByRole('table', { name: 'Data reports' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Space', 'Field', 'Report', 'Reporter', 'Date', 'Status', 'Handled by', 'Actions']);
    expect(within(table).getByRole('link', { name: 'Focus Hub' })).toHaveAttribute(
      'href',
      '/spaces/7',
    );
    expect(within(table).getByText('Huda Saleh')).toBeVisible();
    expect(within(table).getByText('Admin')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Space' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Field' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Remove the field filter' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('keeps a card per report until 1024 px, the filters still in a row at 768', async () => {
    stubScreenWidth(768);
    renderList();

    await screen.findByText('The space opens at 9, not 8.');
    expect(screen.queryByRole('table')).toBeNull();
    const [card] = within(screen.getByRole('list', { name: 'Data reports' })).getAllByRole(
      'listitem',
    );
    expect(within(card as HTMLElement).getByRole('link', { name: 'Focus Hub' })).toBeVisible();
    expect(within(card as HTMLElement).getByText('Admin')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Field' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Filters' })).toBeNull();
  });

  it('moves the filters into a bottom sheet below 768 px, the tags still shown; axe-clean', async () => {
    stubScreenWidth(390);
    const user = userEvent.setup();
    const { baseElement } = renderList('?field=HOURS');

    await screen.findByText('The space opens at 9, not 8.');
    expect(screen.queryByRole('combobox', { name: 'Field' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Remove the field filter' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '1 filter applied' }));

    const sheet = await screen.findByRole('dialog', { name: 'Filters' });
    expect(within(sheet).getByRole('combobox', { name: 'Field' })).toBeVisible();
    expect(within(sheet).getByRole('textbox', { name: 'Space' })).toBeVisible();
    expect(within(sheet).getByRole('button', { name: 'Show 1 report' })).toBeVisible();
    expect(await axe(baseElement)).toHaveNoViolations();
  });

  it('shows a report decided elsewhere with its decision, read from «All», never the stale «New»', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    const elsewhere = adminReport({
      status: 'RESOLVED',
      decision: {
        status: 'RESOLVED',
        at: '2026-10-27T09:00:00.000Z',
        note: null,
        repliedBy: 'MASAHA',
      },
    });
    let refusedOnce = false;
    renderList('?status=open', (request) => {
      if (request.method === 'patch') {
        refusedOnce = true;
        return refused(409, { type: 'conflict', code: 'REPORT_ALREADY_DECIDED' });
      }
      const status = (request.params as { status?: string }).status;
      if (status === 'OPEN') return reportsPage(refusedOnce ? [] : [adminReport()]);
      return reportsPage([refusedOnce ? elsewhere : adminReport()]);
    });

    await user.click(await screen.findByRole('button', { name: 'Open' }));
    const sheet = await screen.findByRole('dialog');
    await user.click(within(sheet).getByRole('button', { name: 'Corrected' }));
    expect(await within(sheet).findByRole('alert')).toBeInTheDocument();
    expect(await within(sheet).findByText('Corrected')).toBeVisible();
    expect(within(sheet).getByText('No reply')).toBeVisible();
    expect(within(sheet).queryByText('New')).toBeNull();
  });

  it('hands the focus to the next tag once one is removed', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    renderList('?space=7&field=HOURS');

    await screen.findByText('The space opens at 9, not 8.');
    await user.click(screen.getByRole('button', { name: 'Remove the space filter' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remove the field filter' })).toHaveFocus();
    });
  });

  it('hands the focus to «Clear filters» when the last tag goes, and to the count once they are cleared', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    renderList('?space=7&field=HOURS');

    await screen.findByText('The space opens at 9, not 8.');
    await user.click(screen.getByRole('button', { name: 'Remove the field filter' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Clear filters' })).toHaveFocus();
    });

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => {
      expect(screen.getByText('1 report')).toHaveFocus();
    });
  });
});
