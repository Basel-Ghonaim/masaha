import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { recordAdminHandover } from '../../repository/adminHandover';
import { TemporaryPasswordDialog } from './TemporaryPasswordDialog';

/** The dialog for Rima's password, the handover answered as recorded. */
function renderDialog(title = 'Temporary password', kind: 'created' | 'issued' = 'created') {
  fakeTransport(() => ({ status: 204 }));
  const onDone = vi.fn();
  // user-event's setup puts its clipboard stub on the navigator, the seam jsdom leaves out.
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <TemporaryPasswordDialog
        person={{ userId: 12, name: 'Rima', email: 'rima@example.com' }}
        password="Tmp-4821-xk"
        kind={kind}
        recordHandover={recordAdminHandover}
        onDone={onDone}
      />
    </QueryClientProvider>,
  );
  return { user, onDone, dialog: screen.getByRole('dialog', { name: title }) };
}

/** The control that opened the dialog, and the dialog, gone once done, as a page holds them. */
function Opener() {
  const [open, setOpen] = useState(true);
  const opener = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={opener} type="button">
        Opener
      </button>
      {open && (
        <TemporaryPasswordDialog
          person={{ userId: 12, name: 'Rima', email: 'rima@example.com' }}
          password="Tmp-4821-xk"
          kind="issued"
          returnFocus={opener}
          recordHandover={recordAdminHandover}
          onDone={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('TemporaryPasswordDialog', () => {
  it('offers no close button, and neither Escape nor a click outside closes it', async () => {
    const { user, dialog, onDone } = renderDialog();

    expect(within(dialog).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    // The open dialog makes the page under it inert to the pointer; a click there is still a click outside.
    await userEvent.setup({ pointerEventsCheck: 0 }).click(document.body);

    expect(screen.getByRole('dialog', { name: 'Temporary password' })).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('shows the password left to right, with the person it is for', () => {
    // In Arabic, so the page around the password runs right to left.
    startPreferences('ar');
    const { dialog } = renderDialog('كلمة المرور المؤقتة');

    expect(within(dialog).getByText('Tmp-4821-xk').closest('[dir]')).toHaveAttribute('dir', 'ltr');
    expect(dialog).toHaveAccessibleDescription(/^Rima\s?·\s?rima@example\.com$/);
    expect(within(dialog).getByText('rima@example.com')).toHaveAttribute('dir', 'ltr');
    // The name isolated from the line around it, whatever its direction.
    expect(within(dialog).getByText('Rima').tagName).toBe('BDI');
  });

  it('names «Done»’s reason until the password is copied, then marks the copy', async () => {
    const { user, dialog } = renderDialog();

    const done = within(dialog).getByRole('button', { name: 'Done' });
    expect(done).toBeDisabled();
    expect(done).toHaveAccessibleDescription('Copy it first — it won’t be shown again');

    await user.click(within(dialog).getByRole('button', { name: 'Copy' }));

    expect(within(dialog).getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(done).toBeEnabled();
    expect(done).not.toHaveAccessibleDescription();
  });

  it('names the handover choices as a group, and focuses it when none is chosen', async () => {
    const { user, dialog } = renderDialog();

    const group = within(dialog).getByRole('radiogroup', { name: 'How it was handed over' });
    await user.click(within(dialog).getByRole('button', { name: 'Copy' }));
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));

    expect(within(dialog).getByText('Choose how it was handed over')).toBeInTheDocument();
    expect(group.contains(document.activeElement)).toBe(true);
  });

  it('says an issued password is changed at the next sign-in, a new account’s at the first', () => {
    const created = renderDialog().dialog;
    expect(
      within(created).getByText(
        'Hand it over; they’ll be asked to change it at their first sign-in.',
      ),
    ).toBeInTheDocument();
    cleanup();

    const issued = renderDialog('Temporary password', 'issued').dialog;
    expect(
      within(issued).getByText(
        'Hand it over once you’ve confirmed who they are; they’ll be asked to change it at their next sign-in.',
      ),
    ).toBeInTheDocument();
    expect(
      within(issued).queryByText(
        'Hand it over; they’ll be asked to change it at their first sign-in.',
      ),
    ).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    renderDialog();

    expect(await axe(document.body)).toHaveNoViolations();
  });

  it.each([
    ['the handover recorded', { status: 204 }],
    [
      'the handover refused, the password no longer pending',
      refused(409, { type: 'conflict', code: 'TEMPORARY_PASSWORD_NOT_PENDING' }),
    ],
  ] as [string, FakeAnswer][])(
    'returns the focus to the control that opened it once done: %s',
    async (_case, answer) => {
      fakeTransport(() => answer);
      const user = userEvent.setup();
      render(
        <QueryClientProvider client={createQueryClient()}>
          <Opener />
        </QueryClientProvider>,
      );
      const dialog = screen.getByRole('dialog', { name: 'Temporary password' });

      await user.click(within(dialog).getByRole('button', { name: 'Copy' }));
      await user.click(within(dialog).getByRole('radio', { name: 'In person' }));
      await user.click(within(dialog).getByRole('button', { name: 'Done' }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Opener' })).toHaveFocus();
    },
  );
});
