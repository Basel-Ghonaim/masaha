import type { StaffMember } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../../test/fakeTransport';
import { stubScreenWidth } from '../../../test/screenWidth';
import { startPreferences } from '../../../test/startPreferences';
import { StaffList } from './StaffList';

const RAHAF: StaffMember = {
  userId: 15,
  name: 'Rahaf',
  email: 'rahaf@example.com',
  isActive: true,
  temporaryPassword: { expiresAt: '2999-01-01T00:00:00Z' },
};

/** The staff of space 7, as the server answers `staff`, at a desk's width. */
function renderList(staff: StaffMember[]) {
  fakeTransport(() => ok(staff));
  render(
    <QueryClientProvider client={createQueryClient()}>
      {/* The page's landmark, as the dashboard's shell draws it. */}
      <main>
        <StaffList spaceId={7} temporaryPassword={() => null} />
      </main>
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
});
