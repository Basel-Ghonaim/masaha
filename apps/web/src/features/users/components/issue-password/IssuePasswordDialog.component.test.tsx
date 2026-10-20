import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { IssuePasswordDialog } from './IssuePasswordDialog';

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

/** The issue for Rima, answered with a password (or by `issue`), the handover recorded. */
function renderDialog(
  issue: () => FakeAnswer | Promise<FakeAnswer> = () =>
    ok({ temporaryPassword: 'Tmp-4821-xk' }, 201),
) {
  fakeTransport((request) =>
    request.url?.endsWith('/handover') === true ? { status: 204 } : issue(),
  );
  const onClose = vi.fn();
  // user-event's setup puts its clipboard stub on the navigator, the seam jsdom leaves out.
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <IssuePasswordDialog
        person={{
          id: 5,
          name: 'Rima',
          email: 'rima@example.com',
          isSuspended: false,
          hasPassword: true,
          ownsSpaces: false,
          atDesk: false,
        }}
        onClose={onClose}
        returnFocus={createRef()}
      />
    </QueryClientProvider>,
  );
  return { user, onClose };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('IssuePasswordDialog', () => {
  it('asks first, opening on Back, with no accessibility violations', async () => {
    renderDialog();

    const confirm = screen.getByRole('alertdialog', {
      name: heard('Issue a temporary password for Rima?'),
    });
    expect(within(confirm).getByRole('button', { name: 'Back' })).toHaveFocus();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('after the issue, shows the one-time dialog, with no way out but «Done»', async () => {
    const { user, onClose } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Issue' }));

    const dialog = await screen.findByRole('dialog', { name: 'Temporary password' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Tmp-4821-xk')).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'Hand it over once you’ve confirmed who they are; they’ll be asked to change it at their next sign-in.',
      ),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Temporary password' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Copy' }));
    await user.click(within(dialog).getByRole('radio', { name: 'In person' }));
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('holds «Back» and Escape while the issue is pending, so the new password is never lost', async () => {
    const answer = deferred<FakeAnswer>();
    const { user, onClose } = renderDialog(() => answer.promise);

    await user.click(screen.getByRole('button', { name: 'Issue' }));

    const confirm = screen.getByRole('alertdialog');
    expect(within(confirm).getByRole('button', { name: 'Back' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    answer.resolve(ok({ temporaryPassword: 'Tmp-4821-xk' }, 201));
    const dialog = await screen.findByRole('dialog', { name: 'Temporary password' });
    expect(within(dialog).getByText('Tmp-4821-xk')).toBeInTheDocument();
  });
});
