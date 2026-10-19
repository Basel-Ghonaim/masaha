import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { UnlinkOwnerDialog } from './UnlinkOwnerDialog';

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

/** The dialog unlinking Rima from Focus Hub, her its last owner; the unlink is refused, the space gone. */
function renderDialog() {
  fakeTransport((request) =>
    request.method === 'get'
      ? ok({ id: 7, isVerified: true, owners: [{ id: 5, name: 'Rima' }] })
      : refused(404, { type: 'not_found' }),
  );
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <UnlinkOwnerDialog
        space={{ id: 7, name: { text: 'Focus Hub' } }}
        owner={{ id: 5, name: 'Rima' }}
        onClose={onClose}
        returnFocus={createRef()}
      />
    </QueryClientProvider>,
  );
  return { onClose };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('UnlinkOwnerDialog', () => {
  it('opens on Back, its action destructive, staying open on a failure', async () => {
    const { onClose } = renderDialog();

    const dialog = screen.getByRole('alertdialog', { name: heard('Unlink Rima from Focus Hub?') });
    expect(within(dialog).getByRole('button', { name: 'Back' })).toHaveFocus();
    const unlink = within(dialog).getByRole('button', { name: 'Unlink' });
    expect(unlink).toHaveClass('bg-destructive');
    await waitFor(() => {
      expect(dialog).toHaveAccessibleDescription(
        'Focus Hub becomes unverified, its live status disappears, and the Masaha team edits it.',
      );
    });

    await userEvent.click(unlink);

    expect(await within(dialog).findByText('The space was deleted meanwhile.')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(/becomes unverified/);
    });
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
