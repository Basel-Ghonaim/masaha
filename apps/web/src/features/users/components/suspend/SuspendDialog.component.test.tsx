import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { SuspendDialog } from './SuspendDialog';

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

/** The dialog suspending Hadi, an owner; by default the suspension is refused, the account gone. */
function renderDialog(
  answer: () => FakeAnswer | Promise<FakeAnswer> = () => refused(404, { type: 'not_found' }),
) {
  fakeTransport(answer);
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <SuspendDialog
        person={{
          id: 3,
          name: 'Hadi',
          email: 'hadi@example.com',
          isSuspended: false,
          hasPassword: true,
          ownsSpaces: true,
          atDesk: false,
        }}
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

describe('SuspendDialog', () => {
  it('opens on Back, its action destructive and staying until the answer, with no accessibility violations', async () => {
    const { onClose } = renderDialog();

    const dialog = screen.getByRole('alertdialog', { name: heard('Suspend Hadi?') });
    expect(dialog).toHaveAccessibleDescription(
      'All their sessions end at once, and they can’t sign in until you restore the account. Their spaces stay verified; the Masaha team edits them only once they’re unlinked.',
    );
    expect(within(dialog).getByRole('button', { name: 'Back' })).toHaveFocus();
    const action = within(dialog).getByRole('button', { name: 'Suspend' });
    expect(action).toHaveClass('bg-destructive');
    expect(await axe(document.body)).toHaveNoViolations();

    await userEvent.click(action);

    expect(await within(dialog).findByText('This account no longer exists.')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('holds «Back» and Escape while the suspension is pending, so its answer is never lost', async () => {
    const answer = deferred<FakeAnswer>();
    const { onClose } = renderDialog(() => answer.promise);
    const dialog = screen.getByRole('alertdialog', { name: heard('Suspend Hadi?') });

    await userEvent.click(within(dialog).getByRole('button', { name: 'Suspend' }));

    expect(within(dialog).getByRole('button', { name: 'Back' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    answer.resolve(refused(404, { type: 'not_found' }));
    expect(await within(dialog).findByText('This account no longer exists.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Back' })).toBeEnabled();
  });
});
