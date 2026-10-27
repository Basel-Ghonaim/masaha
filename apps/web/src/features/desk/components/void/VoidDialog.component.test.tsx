import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import type { VoidTarget } from '../../types/VoidTarget';
import { VoidDialog } from './VoidDialog';

const PAYMENT: VoidTarget = {
  id: 31,
  amountAgorot: 2500,
  method: 'TRANSFER',
  receivedAt: '2026-10-04T09:00:00.000Z',
  who: 'Sara Khalid',
};

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('VoidDialog', () => {
  it('is an alertdialog named by its title, the reason focused first, the action destructive, a failure an alert; axe-clean', async () => {
    const user = userEvent.setup();
    fakeTransport(() => refused(409, { type: 'conflict', code: 'VISIT_WRITTEN_OFF' }));
    const { baseElement } = render(
      <QueryClientProvider client={createQueryClient()}>
        <VoidDialog spaceId={7} payment={PAYMENT} onClose={vi.fn()} returnFocus={vi.fn()} />
      </QueryClientProvider>,
    );

    const dialog = await screen.findByRole('alertdialog', { name: 'Void this payment?' });
    expect(dialog).toHaveAccessibleDescription(/Transfer\. It stays visible, struck through/);
    expect(screen.getByRole('textbox', { name: 'Reason' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Void payment' })).toHaveClass('bg-destructive');
    expect(screen.getByRole('button', { name: 'Back' })).toBeVisible();

    await user.type(screen.getByRole('textbox', { name: 'Reason' }), 'Recorded twice');
    await user.click(screen.getByRole('button', { name: 'Void payment' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A payment of a written-off visit can’t be voided.',
    );
    expect(screen.getByRole('textbox', { name: 'Reason' })).toHaveValue('Recorded twice');
    expect(await axe(baseElement)).toHaveNoViolations();
  });
});
