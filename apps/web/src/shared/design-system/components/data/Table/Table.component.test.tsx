import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '.';

const MEMBERS = [
  { name: 'Sara Helou', plan: 'Monthly', ends: '28/09/2026' },
  { name: 'Mohammed Abu Shaaban', plan: 'Weekly', ends: '29/09/2026' },
];

// jsdom lays nothing out: the widths are set by hand, and the stubbed observer reports when told,
// as the browser's does when a box starts being observed or changes size.
let widths = { scroll: 300, client: 300 };
let reports: (() => void)[] = [];

function resize(scroll: number, client: number) {
  widths = { scroll, client };
  act(() => {
    for (const report of reports) report();
  });
}

beforeEach(() => {
  widths = { scroll: 300, client: 300 };
  reports = [];
  vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(() => widths.scroll);
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(() => widths.client);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        reports.push(() => {
          callback([], this);
        });
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function Rows() {
  return (
    <>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Membership</TableHead>
          <TableHead>Ends on</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {MEMBERS.map((member) => (
          <TableRow key={member.name}>
            <TableCell>{member.name}</TableCell>
            <TableCell>{member.plan}</TableCell>
            <TableCell>{member.ends}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
}

function Members() {
  return (
    <Table aria-label="Members of the space">
      <Rows />
    </Table>
  );
}

describe('Table', () => {
  it('is a table named by its label, with its headers over its cells', () => {
    render(<Members />);
    const table = screen.getByRole('table', { name: 'Members of the space' });

    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Member', 'Membership', 'Ends on']);
    // One header row and a row per member.
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getByRole('cell', { name: 'Monthly' })).toBeInTheDocument();
  });

  it('scrolls in a group of the same one name, by its label or by the element it names', () => {
    render(
      <>
        <Members />
        <h2 id="present">People present</h2>
        <Table aria-labelledby="present">
          <Rows />
        </Table>
      </>,
    );

    const members = screen.getByRole('group', { name: 'Members of the space' });
    expect(within(members).getByRole('table', { name: 'Members of the space' })).toBeVisible();
    const present = screen.getByRole('group', { name: 'People present' });
    expect(within(present).getByRole('table', { name: 'People present' })).toBeVisible();
  });

  it('is no tab stop while it fits', async () => {
    const user = userEvent.setup();
    render(<Members />);
    resize(300, 300);

    expect(screen.getByRole('group')).not.toHaveAttribute('tabindex');
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it('becomes a tab stop once it overflows', async () => {
    const user = userEvent.setup();
    render(<Members />);
    resize(600, 300);

    await user.tab();
    expect(screen.getByRole('group', { name: 'Members of the space' })).toHaveFocus();
  });

  it('has no accessibility violations while it overflows', async () => {
    const { container } = render(<Members />);
    resize(600, 300);

    expect(await axe(container)).toHaveNoViolations();
  });

  it('takes exactly one name (proven by `typecheck`)', () => {
    // Types only: `typecheck` fails if either line is accepted.
    // @ts-expect-error — a table with no name.
    const nameless = <Table />;
    // @ts-expect-error — a table with two names.
    const twice = <Table aria-label="Members" aria-labelledby="present" />;
    expect([nameless, twice]).toHaveLength(2);
  });
});
