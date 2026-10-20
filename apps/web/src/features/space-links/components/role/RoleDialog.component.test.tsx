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
import { RoleDialog } from './RoleDialog';

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

/**
 * The dialog making Rima an admin; by default the change is refused, another admin having acted
 * meanwhile.
 */
function renderDialog(
  answer: () => FakeAnswer | Promise<FakeAnswer> = () =>
    refused(409, { type: 'conflict', code: 'LAST_ADMIN' }),
) {
  fakeTransport(answer);
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RoleDialog
        person={{ id: 5, name: 'Rima', role: 'USER' }}
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

describe('RoleDialog', () => {
  it('opens on Back, its action destructive and staying until the answer, with no accessibility violations', async () => {
    const { onClose } = renderDialog();

    const dialog = screen.getByRole('alertdialog', { name: heard('Make Rima an admin?') });
    expect(dialog).toHaveAccessibleDescription(
      'They get every admin power over the platform and all its spaces, and their sessions end so they sign in again.',
    );
    expect(within(dialog).getByRole('button', { name: 'Back' })).toHaveFocus();
    const action = within(dialog).getByRole('button', { name: 'Make them an admin' });
    expect(action).toHaveClass('bg-destructive');
    expect(await axe(document.body)).toHaveNoViolations();

    await userEvent.click(action);

    expect(
      await within(dialog).findByText('The platform must keep at least one active admin.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('holds «Back» and Escape while the change is pending, so its answer is never lost', async () => {
    const answer = deferred<FakeAnswer>();
    const { onClose } = renderDialog(() => answer.promise);
    const dialog = screen.getByRole('alertdialog', { name: heard('Make Rima an admin?') });

    await userEvent.click(within(dialog).getByRole('button', { name: 'Make them an admin' }));

    expect(within(dialog).getByRole('button', { name: 'Back' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    answer.resolve(refused(409, { type: 'conflict', code: 'LAST_ADMIN' }));
    expect(
      await within(dialog).findByText('The platform must keep at least one active admin.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Back' })).toBeEnabled();
  });
});
