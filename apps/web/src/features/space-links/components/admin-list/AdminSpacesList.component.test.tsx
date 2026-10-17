import type { PaginationMeta } from '@masaha/shared/core';
import type { AdminSpaceRow } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import type { PlaceFilter } from '../../types/PlaceFilter';
import { AdminSpacesList } from './AdminSpacesList';

const FOCUS: AdminSpaceRow = {
  id: 7,
  slug: 'focus-hub',
  nameEn: 'Focus Hub',
  nameAr: null,
  area: { id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  isVerified: true,
  isHidden: false,
  deletedAt: null,
  owners: [{ id: 3, name: 'Ahmad' }],
  staleGroups: ['prices', 'contacts'],
  missingGroups: ['hours'],
  lastUpdatedAt: '2026-09-27T08:00:00Z',
};
const PALM: AdminSpaceRow = {
  id: 9,
  slug: 'palm-hub',
  nameEn: 'Palm Hub',
  nameAr: 'بالم',
  area: { id: 12, nameAr: 'النصر', nameEn: 'An-Nasr' },
  isVerified: false,
  isHidden: true,
  deletedAt: null,
  owners: [],
  staleGroups: [],
  missingGroups: [],
  lastUpdatedAt: '2026-09-20T08:00:00Z',
};
const OLIVE: AdminSpaceRow = {
  id: 12,
  slug: 'olive-desk',
  nameEn: 'Olive Desk',
  nameAr: null,
  area: { id: 13, nameAr: 'دير البلح', nameEn: 'Deir al-Balah' },
  isVerified: true,
  isHidden: false,
  deletedAt: '2026-10-01T08:00:00Z',
  owners: [{ id: 5, name: 'Rima' }],
  staleGroups: [],
  missingGroups: [],
  lastUpdatedAt: '2026-09-12T08:00:00Z',
};

/** A page of `rows` with its meta. */
function page(rows: AdminSpaceRow[], meta: Partial<PaginationMeta> = {}): FakeAnswer {
  return {
    status: 200,
    data: {
      success: true,
      data: rows,
      meta: {
        currentPage: 1,
        limit: 20,
        totalPages: 1,
        totalRecords: rows.length,
        hasNextPage: false,
        hasPreviousPage: false,
        ...meta,
      },
    },
  };
}

/** A place field as a page sets one: a select of one governorate, handed the list's filter. */
function placeField({
  value,
  onChange,
}: {
  value: PlaceFilter;
  onChange: (value: PlaceFilter) => void;
}) {
  return (
    <Select
      value={value === null ? 'all' : 'gaza'}
      onValueChange={(option) => {
        onChange(option === 'all' ? null : { governorateId: 1 });
      }}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All areas</SelectItem>
        <SelectItem value="gaza">Gaza</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** The list at `path`, the server answering with `answer`; a row's actions, the page's seam. */
function renderList(
  path: string,
  answer: Parameters<typeof fakeTransport>[0] = () => page([FOCUS, PALM]),
) {
  const requests = fakeTransport(answer);
  const client = createQueryClient();
  const router = createMemoryRouter(
    [
      {
        path: '/spaces',
        element: (
          <main>
            <AdminSpacesList
              actions={(row) =>
                row.deletedAt !== null ? (
                  <button type="button">{`Restore ${row.nameEn}`}</button>
                ) : (
                  <button type="button">{`Actions for ${row.nameEn}`}</button>
                )
              }
              placeField={placeField}
              spaceLink={(row) => `/spaces/${String(row.id)}`}
            />
          </main>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  const rendered = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...rendered, requests, router, client };
}

const listRegion = () => screen.findByRole('region', { name: 'Spaces' });

/** A row's cells, the header row first; `[]` when the row is not there. */
const cellsOf = (row: HTMLElement | undefined) =>
  row
    ? within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent)
    : [];

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('AdminSpacesList, from 768 px', () => {
  beforeEach(() => {
    stubScreenWidth(1280);
  });

  it('shows a table: each space’s name, area, state, owners, freshness, last update and actions', async () => {
    renderList('/spaces');

    const table = await screen.findByRole('table', { name: 'Spaces' });
    await within(table).findByText('Focus Hub');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Space', 'Area', 'Status', 'Owner', 'Freshness', 'Last update', 'Actions']);
    const [, focus, palm] = within(table).getAllByRole('row');
    expect(cellsOf(focus)).toEqual([
      'Focus Hub',
      'Al-Rimal',
      'Verified',
      '⁨Ahmad⁩',
      'Stale: Prices, ContactsMissing: Opening hours',
      '27 Sept',
      'Actions for Focus Hub',
    ]);
    expect(cellsOf(palm)).toEqual([
      'Palm Hub',
      'An-Nasr',
      'UnverifiedHidden',
      '—No owner',
      'Up to date',
      '20 Sept',
      'Actions for Palm Hub',
    ]);
  });

  it('asks for the deleted spaces when the status says so, and shows them muted with one way back', async () => {
    const { requests } = renderList('/spaces?status=deleted', () => page([OLIVE]));

    const table = await screen.findByRole('table', { name: 'Spaces' });
    await within(table).findByText('Olive Desk');
    // A deleted row carries one muted line and no badge of its own, as the design draws it.
    expect(cellsOf(within(table).getAllByRole('row')[1])).toEqual([
      'Olive Desk',
      'Deir al-Balah',
      'Deleted · 1 Oct',
      '⁨Rima⁩',
      '—',
      '12 Sept',
      'Restore Olive Desk',
    ]);
    expect(within(table).getByText('Deleted · 1 Oct')).toHaveClass('text-muted-foreground');
    expect(within(table).getByText('—')).toHaveAttribute('aria-hidden', 'true');
    expect(requests[0]?.params).toMatchObject({ status: 'deleted' });
    // A deleted space leads nowhere: its editor would only say that it is gone.
    expect(within(table).getByText('Olive Desk')).toHaveClass('text-muted-foreground');
    expect(within(table).queryByRole('link', { name: 'Olive Desk' })).toBeNull();
    expect(within(table).getByRole('button', { name: 'Restore Olive Desk' })).toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Actions for Olive Desk' })).toBeNull();
  });

  it('offers every status of the contract, the deleted spaces among them', async () => {
    const { router } = renderList('/spaces');
    await screen.findByText('Focus Hub');

    await userEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
      'All statuses',
      'Verified',
      'Unverified',
      'Hidden',
      'Deleted',
    ]);

    await userEvent.click(screen.getByRole('option', { name: 'Deleted' }));
    expect(router.state.location.search).toBe('?status=deleted');
  });

  it('reads a space with no owner as having none, not as a dash', async () => {
    renderList('/spaces');

    const table = await screen.findByRole('table', { name: 'Spaces' });
    const dash = await within(table).findByText('—');
    expect(dash).toHaveAttribute('aria-hidden', 'true');
    expect(within(table).getByText('No owner')).toHaveClass('sr-only');
  });

  it('marks an English-only name as English in the Arabic interface', async () => {
    startPreferences('ar');
    renderList('/spaces');

    expect(await screen.findByText('Focus Hub')).toHaveAttribute('lang', 'en');
    expect(screen.getByText('بالم')).not.toHaveAttribute('lang');
  });

  it('shows the count the filters keep beside the search', async () => {
    renderList('/spaces', () => page([FOCUS, PALM], { totalRecords: 42, totalPages: 3 }));

    expect(await screen.findByText('Spaces: 42')).toBeInTheDocument();
  });

  it('links each page, the current one marked, keeping the filters', async () => {
    renderList('/spaces?stale=true&page=2', () =>
      page([FOCUS], { currentPage: 2, totalPages: 3, totalRecords: 41 }),
    );

    const pages = await screen.findByRole('navigation', { name: 'Pages of the spaces list' });
    expect(within(pages).getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/spaces?stale=true',
    );
    expect(within(pages).getByRole('link', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(pages).getByRole('link', { name: 'Page 3' })).toHaveAttribute(
      'href',
      '/spaces?stale=true&page=3',
    );
    expect(within(pages).getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/spaces?stale=true&page=3',
    );
  });

  it('keeps the focus on the page chosen from the keyboard while it loads, the list marked busy', async () => {
    const next = deferred<FakeAnswer>();
    renderList('/spaces', (request) =>
      (request.params as { page: number }).page === 2
        ? next.promise
        : page([FOCUS], { currentPage: 1, totalPages: 2, totalRecords: 21 }),
    );
    const pages = await screen.findByRole('navigation', { name: 'Pages of the spaces list' });
    const second = within(pages).getByRole('link', { name: 'Page 2' });

    second.focus();
    await userEvent.keyboard('{Enter}');

    expect(await listRegion()).toHaveAttribute('aria-busy', 'true');
    expect(second).toHaveFocus();
    await act(async () => {
      next.resolve(page([PALM], { currentPage: 2, totalPages: 2, totalRecords: 21 }));
      await next.promise;
    });
    expect(await screen.findByText('Palm Hub')).toBeInTheDocument();
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute('aria-current', 'page');
    expect(await listRegion()).not.toHaveAttribute('aria-busy');
  });

  it('shows no pages when there is only one', async () => {
    renderList('/spaces');

    await screen.findByText('Focus Hub');
    expect(screen.queryByRole('navigation', { name: 'Pages of the spaces list' })).toBeNull();
  });

  it('sets the search, the place, the state and the stale or missing chip above the table', async () => {
    const { router } = renderList('/spaces');
    await screen.findByText('Focus Hub');

    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveAttribute(
      'placeholder',
      'Space name',
    );
    await userEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Hidden' }));
    await userEvent.click(screen.getByRole('button', { name: 'Stale or missing' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Governorate / area' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Gaza' }));

    expect(router.state.location.search).toBe('?status=hidden&governorate=1&stale=true');
  });

  it('keeps stale or missing a chip by the count, not a field of its own', async () => {
    const { router } = renderList('/spaces');
    await screen.findByText('Spaces: 2');

    const chip = screen.getByRole('toolbar', { name: 'Quick filter' });
    const stale = within(chip).getByRole('button', { name: 'Stale or missing' });
    expect(stale).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('switch')).toBeNull();

    await userEvent.click(stale);

    expect(router.state.location.search).toBe('?stale=true');
    expect(await within(chip).findByRole('button', { name: 'Stale or missing' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows placeholder rows while the first page loads', async () => {
    renderList('/spaces', () => new Promise<FakeAnswer>(() => undefined));

    expect(await screen.findByRole('table', { name: 'Spaces' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('says when there are no spaces yet', async () => {
    renderList('/spaces', () => page([]));

    expect(await screen.findByRole('heading', { name: 'No spaces yet' })).toBeInTheDocument();
    expect(screen.getByText('Spaces appear here once they are added.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('says when no space matches the filters, and clears them', async () => {
    const { router } = renderList('/spaces?q=Palm&status=hidden', () => page([]));

    await screen.findByRole('heading', { name: 'No spaces match the filters' });
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(router.state.location.search).toBe('');
  });

  it('shows a failure to load, with its reference and Try again', async () => {
    const { requests } = renderList('/spaces', (_request, index) =>
      index === 0 ? refused(403, { type: 'forbidden' }) : page([FOCUS]),
    );

    await screen.findByRole('heading', { name: 'We couldn’t load the spaces' });
    expect(screen.getByText('You don’t have permission to do this.')).toBeInTheDocument();
    expect(screen.getByText(/req-1/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Focus Hub')).toBeInTheDocument();
    expect(requests).toHaveLength(2);
  });

  it('moves the focus to the list when the row that held it leaves', async () => {
    const { client } = renderList('/spaces', (_request, index) =>
      index === 0 ? page([FOCUS, PALM]) : page([FOCUS]),
    );
    const actions = await screen.findByRole('button', { name: 'Actions for Palm Hub' });
    actions.focus();

    await act(() => client.refetchQueries());

    await waitFor(async () => {
      expect(await listRegion()).toHaveFocus();
    });
  });

  it('leaves the focus where it is when another row leaves', async () => {
    const { client } = renderList('/spaces', (_request, index) =>
      index === 0 ? page([FOCUS, PALM]) : page([FOCUS]),
    );
    const actions = await screen.findByRole('button', { name: 'Actions for Focus Hub' });
    actions.focus();

    await act(() => client.refetchQueries());
    await waitFor(() => {
      expect(screen.queryByText('Palm Hub')).toBeNull();
    });

    expect(actions).toHaveFocus();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderList('/spaces', () =>
      page([FOCUS, PALM], { totalPages: 2, totalRecords: 22 }),
    );
    await screen.findByText('Focus Hub');

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('AdminSpacesList, on a phone', () => {
  beforeEach(() => {
    stubScreenWidth(390);
  });

  it('shows each space as a card with the same facts', async () => {
    renderList('/spaces');
    await screen.findByText('Focus Hub');

    const cards = within(screen.getByRole('list', { name: 'Spaces' })).getAllByRole('listitem');
    expect(cards.map((card) => card.textContent)).toEqual([
      'Focus HubAl-Rimal · Owner: ⁨Ahmad⁩ · 27 SeptVerifiedStale: Prices, ContactsMissing: Opening hoursActions for Focus Hub',
      'Palm HubAn-Nasr · Owner: —Owner: No owner · 20 SeptUnverifiedHiddenUp to dateActions for Palm Hub',
    ]);
  });

  it('shows a deleted space as a card, muted, with one line and its one action', async () => {
    renderList('/spaces?status=deleted', () => page([OLIVE]));
    await screen.findByText('Olive Desk');

    const card = screen.getByRole('listitem');
    expect(card.textContent).toBe(
      'Olive DeskDeir al-Balah · Owner: ⁨Rima⁩ · 12 SeptDeleted · 1 OctRestore Olive Desk',
    );
    expect(within(card).getByText('Olive Desk')).toHaveClass('text-muted-foreground');
    expect(within(card).getByText('Deleted · 1 Oct')).toHaveClass('text-muted-foreground');
    expect(within(card).queryByRole('button', { name: 'Actions for Olive Desk' })).toBeNull();
  });

  it('keeps the search in view and the other filters in a sheet, with their count', async () => {
    const { router } = renderList('/spaces?status=hidden&stale=true');
    await screen.findByText('Focus Hub');

    expect(screen.getByRole('searchbox', { name: 'Search' })).toBeVisible();
    // Stale or missing is a chip on every width, so the sheet keeps the two fields only,
    // and counts the two only: the chip above it is one of them, not a field.
    expect(screen.getByRole('button', { name: 'Stale or missing' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Filters, 1 applied' }));
    const sheet = await screen.findByRole('dialog', { name: 'Filters' });
    expect(within(sheet).getByRole('combobox', { name: 'Governorate / area' })).toBeInTheDocument();
    expect(within(sheet).getByRole('combobox', { name: 'Status' })).toHaveTextContent('Hidden');
    expect(within(sheet).queryByRole('switch')).toBeNull();

    await userEvent.click(within(sheet).getByRole('button', { name: 'Clear filters' }));
    // The sheet clears its own two fields and nothing else: the chip above stays where it is.
    expect(router.state.location.search).toBe('?stale=true');
    await userEvent.keyboard('{Escape}');

    expect(await screen.findByRole('button', { name: 'Filters' })).toHaveFocus();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderList('/spaces');
    await screen.findByText('Focus Hub');

    expect(await axe(container)).toHaveNoViolations();
  });

  it('names each space with a link to its page', async () => {
    renderList('/spaces');
    const region = await listRegion();

    expect(await within(region).findByRole('link', { name: 'Focus Hub' })).toHaveAttribute(
      'href',
      `/spaces/${String(FOCUS.id)}`,
    );
  });
});
