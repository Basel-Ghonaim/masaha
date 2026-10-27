import type { PaymentRow } from '@masaha/shared/payments';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import type { VoidTarget } from '../../types/VoidTarget';
import { VoidPaymentAction } from './VoidPaymentAction';

const PAYMENT: VoidTarget = {
  id: 31,
  amountAgorot: 2500,
  method: 'CASH',
  receivedAt: '2026-10-04T09:00:00.000Z',
  who: 'Sara Khalid',
};
const VOIDED: Partial<PaymentRow> = { id: 31, voided: null };

/** A row that offers the «⋯» until its payment is voided, as a statement's or the ledger's. */
function renderAction(onGone: () => void) {
  fakeTransport(() => ok(VOIDED));
  function Row() {
    const [shown, setShown] = useState(true);
    return (
      <>
        {shown && <VoidPaymentAction spaceId={7} payment={PAYMENT} onGone={onGone} />}
        <button
          type="button"
          onClick={() => {
            setShown(false);
          }}
        >
          Voided elsewhere
        </button>
      </>
    );
  }
  render(
    <QueryClientProvider client={createQueryClient()}>
      <Row />
    </QueryClientProvider>,
  );
}

const heard = (name: string) => (_: string, element: Element | null) =>
  (element?.getAttribute('aria-label') ?? '').replace(/[⁦-⁩]/g, '') === name;

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('VoidPaymentAction', () => {
  it('names the «⋯» and its menu by the amount and who, and gives the focus back to it after the dialog', async () => {
    const user = userEvent.setup();
    const onGone = vi.fn();
    renderAction(onGone);

    const trigger = screen.getByRole('button', {
      name: heard('Payment actions: ₪25 · Sara Khalid'),
    });
    await user.click(trigger);
    expect(
      await screen.findByRole('menu', { name: heard('Payment actions: ₪25 · Sara Khalid') }),
    ).toBeVisible();
    await user.click(screen.getByRole('menuitem', { name: 'Void payment…' }));
    expect(await screen.findByRole('alertdialog', { name: 'Void this payment?' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
    expect(onGone).not.toHaveBeenCalled();
  });

  it('calls `onGone` once the «⋯» leaves while it holds the focus', async () => {
    const onGone = vi.fn();
    renderAction(onGone);

    const trigger = screen.getByRole('button', {
      name: heard('Payment actions: ₪25 · Sara Khalid'),
    });
    trigger.focus();
    // The row leaves under the focus, as a refetch after the void removes it.
    screen.getByRole('button', { name: 'Voided elsewhere' }).click();

    await waitFor(() => {
      expect(onGone).toHaveBeenCalledTimes(1);
    });
  });
});
