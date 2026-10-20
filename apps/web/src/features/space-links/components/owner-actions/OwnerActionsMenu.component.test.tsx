import type { AdminUserRow } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { CATALOGUES } from '@shared/copy';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { userRowView } from '../../services/userRowView';
import { OwnerActionsMenu } from './OwnerActionsMenu';

const RIMA: AdminUserRow = {
  id: 5,
  name: 'Rima',
  email: 'rima@example.com',
  role: 'OWNER',
  isSuspended: false,
  signIn: { password: true, google: false },
  joinedAt: '2026-09-01T08:00:00Z',
  spaces: [
    { id: 7, nameEn: 'Focus Hub', nameAr: null },
    { id: 9, nameEn: 'Palm Hub', nameAr: 'بالم' },
  ],
  receptionSpaces: [],
};

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

/** The row's menu, as the owners list shows it. */
function renderMenu(row: AdminUserRow) {
  fakeTransport(() => ok({ id: 7, isVerified: true, owners: [{ id: 5, name: 'Rima' }] }));
  const view = userRowView(row, {
    words: CATALOGUES.en.spaceLinks.usersList.row,
    english: true,
    now: new Date(),
  });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <OwnerActionsMenu row={view} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('OwnerActionsMenu', () => {
  it('offers to link and one unlink per space, the link unavailable with its reason for a suspended account', async () => {
    renderMenu({ ...RIMA, isSuspended: true });

    await userEvent.click(screen.getByRole('button', { name: heard('Actions: Rima') }));

    const link = screen.getByRole('menuitem', { name: /^Link to a space/ });
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(
      within(link).getByText('The account is suspended — restore it first'),
    ).toBeInTheDocument();
    const unlinks = screen.getAllByRole('menuitem', { name: /^Unlink from/ });
    expect(unlinks.map((item) => item.textContent)).toEqual([
      'Unlink from Focus Hub',
      'Unlink from Palm Hub',
    ]);
  });

  it('offers the link to an active owner, and asks before an unlink', async () => {
    renderMenu(RIMA);

    await userEvent.click(screen.getByRole('button', { name: heard('Actions: Rima') }));
    expect(screen.getByRole('menuitem', { name: 'Link to a space' })).not.toHaveAttribute(
      'aria-disabled',
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Unlink from Palm Hub' }));

    expect(
      await screen.findByRole('alertdialog', { name: heard('Unlink Rima from Palm Hub?') }),
    ).toBeInTheDocument();
  });
});
