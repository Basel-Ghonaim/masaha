import type { StaffMember } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../../test/fakeTransport';
import { stubScreenWidth } from '../../../test/screenWidth';
import { startPreferences } from '../../../test/startPreferences';
import type { StaffCollections } from '../types/StaffCollections';
import { StaffList } from './StaffList';

const RAHAF: StaffMember = {
  userId: 15,
  name: 'Rahaf',
  email: 'rahaf@example.com',
  isActive: true,
  addedAt: '2026-09-14T08:30:00.000Z',
  temporaryPassword: { expiresAt: '2999-01-01T00:00:00Z' },
};

/** The staff of space 7, as the server answers `staff`, at a desk's width. */
function renderList(
  staff: StaffMember[],
  collections: StaffCollections = { of: () => 0, link: (id) => `/ledger/${String(id)}` },
) {
  fakeTransport(() => ok(staff));
  render(
    <QueryClientProvider client={createQueryClient()}>
      {/* The page's landmark, as the dashboard's shell draws it. */}
      <MemoryRouter>
        <main>
          <StaffList spaceId={7} temporaryPassword={() => null} collections={collections} />
        </main>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const heard = (expected: string) => (name: string) =>
  name.replace(/[\u2066-\u2069]/g, '') === expected;

beforeEach(() => {
  startPreferences('en');
  stubScreenWidth(1280);
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('StaffList', () => {
  it('names each row’s menu by its person, with «Add staff member» in the toolbar, and no axe violations', async () => {
    renderList([RAHAF]);

    // The table shows placeholder rows while the list loads: the person's row once it has arrived.
    const row = (await screen.findByText('Rahaf')).closest('tr');
    if (row === null) throw new Error('no row');
    expect(within(row).getByText('rahaf@example.com')).toBeInTheDocument();
    expect(within(row).getByText('Hasn’t changed the temporary password yet')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: heard('Actions: Rahaf') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add staff member' })).toBeInTheDocument();
    expect(screen.getByText('1 staff member')).toBeInTheDocument();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('offers «Add staff member» in the empty state, once', async () => {
    renderList([]);

    expect(await screen.findByText('No staff yet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add staff member' })).toHaveLength(1);
  });
  it('reaches the held «New temporary password» by the keyboard, its reason read with it', async () => {
    const user = userEvent.setup();
    renderList([{ ...RAHAF, temporaryPassword: null }]);

    const trigger = await screen.findByRole('button', { name: heard('Actions: Rahaf') });
    trigger.focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('menu');
    const visited = [document.activeElement];
    await user.keyboard('{ArrowDown}');
    visited.push(document.activeElement);
    await user.keyboard('{ArrowUp}');
    visited.push(document.activeElement);

    // Radix skips a disabled item: the held one stays in the arrow keys' path (finding 105).
    const held = visited.find((element) => element?.textContent.includes('New temporary password'));
    expect(held).toHaveAttribute('role', 'menuitem');
    expect(held).toHaveAttribute('aria-disabled', 'true');
    expect(held).toHaveTextContent('They’ve changed the temporary password');
  });
  it('shows «Added» and «Collected this month», the amount a link to that person’s ledger', async () => {
    const mona: StaffMember = { ...RAHAF, userId: 16, name: 'Mona', email: 'mona@example.com' };
    renderList([RAHAF, mona], {
      of: (id) => (id === 16 ? 60_000 : 0),
      link: (id) => `/ledger/${String(id)}`,
    });

    const table = await screen.findByRole('table');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Name', 'Status', 'Added', 'Collected this month', 'Actions']);
    const row = (await screen.findByText('Mona')).closest('tr') as HTMLElement;
    expect(within(row).getByText('14 September 2026')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: '₪600' })).toHaveAttribute('href', '/ledger/16');
    const rahaf = screen.getByText('Rahaf').closest('tr') as HTMLElement;
    expect(within(rahaf).getByRole('link', { name: '₪0' })).toHaveAttribute('href', '/ledger/15');
  });

  it('shows «—» when the month’s collections could not be read', async () => {
    renderList([RAHAF], { of: () => null, link: (id) => `/ledger/${String(id)}` });

    const row = (await screen.findByText('Rahaf')).closest('tr') as HTMLElement;
    expect(within(row).getByRole('link', { name: '—' })).toBeInTheDocument();
    expect(within(row).queryByText('₪0')).toBeNull();
  });

  it('opens that person’s ledger from the menu’s «View collections»', async () => {
    const user = userEvent.setup();
    renderList([RAHAF]);

    await user.click(await screen.findByRole('button', { name: heard('Actions: Rahaf') }));
    expect(await screen.findByRole('menuitem', { name: 'View collections' })).toHaveAttribute(
      'href',
      '/ledger/15',
    );
  });
});
