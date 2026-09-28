import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { DataTable, createDataTableColumnHelper, type DataTableProps } from '.';

type Member = { id: string; name: string; plan: string; ends: string };

const MEMBERS: Member[] = [
  { id: 'm1', name: 'Sara Helou', plan: 'Monthly', ends: '2026-09-28' },
  { id: 'm2', name: 'Ahmed Siam', plan: 'Weekly', ends: '2026-09-19' },
  { id: 'm3', name: 'Layan Awad', plan: 'Monthly', ends: '2026-10-14' },
];

const helper = createDataTableColumnHelper<Member>();
const COLUMNS = helper.columns([
  helper.accessor('name', { header: 'Member', enableSorting: true }),
  helper.accessor('plan', { header: 'Membership' }),
  helper.accessor('ends', { header: 'Ends on', enableSorting: true }),
]);

let screenWidth = 1280;

beforeEach(() => {
  screenWidth = 1280;
  vi.stubGlobal('matchMedia', (query: string) => {
    const minWidth = /\(min-width:\s*(\d+)px\)/.exec(query);
    return {
      matches: minWidth !== null && screenWidth >= Number(minWidth[1]),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function Members(props: Partial<DataTableProps<Member>>) {
  return (
    <DataTable
      label="Members of the space"
      columns={COLUMNS}
      data={MEMBERS}
      getRowId={(member) => member.id}
      renderCard={(member) => <p>{`${member.name}, ${member.plan}`}</p>}
      empty={<p>No members yet</p>}
      summary="Showing 1–3 of 3"
      pagination={<nav aria-label="Pages of the members list" />}
      {...props}
    />
  );
}

function names() {
  return within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent);
}

describe('DataTable', () => {
  it('shows a table named by its label, with its summary and pagination under it', () => {
    render(<Members />);
    const table = screen.getByRole('table', { name: 'Members of the space' });

    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Member', 'Membership', 'Ends on']);
    expect(names()).toEqual(['Sara Helou', 'Ahmed Siam', 'Layan Awad']);
    expect(screen.getByText('Showing 1–3 of 3')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Pages of the members list' }),
    ).toBeInTheDocument();
  });

  it('sorts a column that asks to, and says the order with aria-sort', async () => {
    render(<Members />);
    const header = screen.getByRole('columnheader', { name: 'Member' });

    expect(header).toHaveAttribute('aria-sort', 'none');

    await userEvent.click(within(header).getByRole('button', { name: 'Member' }));

    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(names()).toEqual(['Ahmed Siam', 'Layan Awad', 'Sara Helou']);

    await userEvent.click(within(header).getByRole('button', { name: 'Member' }));

    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(names()).toEqual(['Sara Helou', 'Layan Awad', 'Ahmed Siam']);
  });

  it('leaves a column unsortable unless it asks', () => {
    render(<Members />);
    const header = screen.getByRole('columnheader', { name: 'Membership' });

    expect(header).not.toHaveAttribute('aria-sort');
    expect(within(header).queryByRole('button')).not.toBeInTheDocument();
  });

  it('reports the sorting and keeps the order when the server sorts', async () => {
    const onSortingChange = vi.fn();
    render(<Members sorting={[]} onSortingChange={onSortingChange} manualSorting />);

    await userEvent.click(screen.getByRole('button', { name: 'Ends on' }));

    expect(onSortingChange).toHaveBeenCalledWith([{ id: 'ends', desc: false }]);
    expect(names()).toEqual(['Sara Helou', 'Ahmed Siam', 'Layan Awad']);
  });

  it('stands placeholder rows in while loading, and marks the table busy', () => {
    render(<Members loading loadingRows={4} />);
    const table = screen.getByRole('table', { name: 'Members of the space' });

    expect(table).toHaveAttribute('aria-busy', 'true');
    expect(within(table).queryByText('Sara Helou')).not.toBeInTheDocument();
    // Only the header row is exposed: the placeholder rows are hidden.
    expect(within(table).getAllByRole('row')).toHaveLength(1);
  });

  it('shows the empty content in place of the rows', () => {
    render(<Members data={[]} />);

    expect(
      within(screen.getByRole('table')).getByRole('cell', { name: 'No members yet' }),
    ).toHaveAttribute('colspan', '3');
  });

  it('shows each row as a card from renderCard below 768px, without the summary', () => {
    screenWidth = 360;
    render(<Members />);
    const list = screen.getByRole('list', { name: 'Members of the space' });

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Sara Helou, Monthly', 'Ahmed Siam, Weekly', 'Layan Awad, Monthly']);
    expect(screen.queryByText('Showing 1–3 of 3')).not.toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Pages of the members list' }),
    ).toBeInTheDocument();
  });

  it('marks the list of cards busy while loading, and shows the empty content when there are none', () => {
    screenWidth = 360;
    const { rerender } = render(<Members loading />);

    expect(screen.getByRole('list', { name: 'Members of the space' })).toHaveAttribute(
      'aria-busy',
      'true',
    );

    rerender(<Members data={[]} />);

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText('No members yet')).toBeInTheDocument();
  });

  it.each([1280, 360])('has no accessibility violations at %ipx', async (width) => {
    screenWidth = width;
    const { container } = render(<Members />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
