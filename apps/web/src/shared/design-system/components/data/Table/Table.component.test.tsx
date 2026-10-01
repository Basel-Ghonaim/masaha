import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '.';

const MEMBERS = [
  { name: 'Sara Helou', plan: 'Monthly', ends: '28/09/2026' },
  { name: 'Mohammed Abu Shaaban', plan: 'Weekly', ends: '29/09/2026' },
];

function Members() {
  return (
    <Table>
      <TableCaption>Members of the space</TableCaption>
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
    </Table>
  );
}

describe('Table', () => {
  it('is a table named by its caption, with its headers over its cells', () => {
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

  it('has no accessibility violations', async () => {
    const { container } = render(<Members />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
