import type { PaymentRow } from '@masaha/shared/payments';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { findToast } from '../../../../test/findToast';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { VoidDialog } from '../../components/void/VoidDialog';
import type { VoidTarget } from '../../types/VoidTarget';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

const PAYMENT: VoidTarget = {
  id: 31,
  amountAgorot: 2500,
  method: 'CASH',
  receivedAt: '2026-10-04T09:00:00.000Z',
  who: 'Sara Khalid',
};
const VOIDED: PaymentRow = {
  id: 31,
  amountAgorot: 2500,
  method: 'CASH',
  note: null,
  receivedAt: '2026-10-04T09:00:00.000Z',
  item: { kind: 'SUBSCRIPTION', id: 3, name: 'Every other day' },
  customer: { id: 4, name: 'Sara Khalid' },
  recordedBy: { id: 15, name: 'Laila' },
  voided: { at: '2026-10-05T09:00:00.000Z', by: { id: 14, name: 'Ahmad' }, reason: 'Twice' },
};

function renderDialog(answer: () => FakeAnswer = () => ok(VOIDED)) {
  const requests = fakeTransport(answer);
  const onClose = vi.fn();
  const client = createQueryClient();
  const invalidated = vi.spyOn(client, 'invalidateQueries');
  // The «⋯» closes the dialog once it is done, as here.
  function Opened() {
    const [open, setOpen] = useState(true);
    return open ? (
      <VoidDialog
        spaceId={7}
        payment={PAYMENT}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        returnFocus={vi.fn()}
      />
    ) : null;
  }
  render(
    <QueryClientProvider client={client}>
      <Opened />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { requests, onClose, invalidated };
}

/** The scopes read again, by their keys. */
const keysOf = (invalidated: MockInstance<QueryClient['invalidateQueries']>) =>
  invalidated.mock.calls.map(([filters]) => filters?.queryKey);

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('useVoidDialog', () => {
  it('requires a reason, sends it once, and its toast names the amount and who', async () => {
    const user = userEvent.setup();
    const { requests, onClose, invalidated } = renderDialog();

    expect(
      screen.getByText(
        heard(
          '₪25 · Sara Khalid · 4 Oct · Cash. It stays visible, struck through, with the reason and your name, and counts in neither income nor the handover. It can’t be undone.',
        ),
      ),
    ).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Reason' }), '   ');
    await user.click(screen.getByRole('button', { name: 'Void payment' }));
    expect(await screen.findByText('Write why it is voided')).toBeInTheDocument();
    expect(requests).toHaveLength(0);

    await user.clear(screen.getByRole('textbox', { name: 'Reason' }));
    await user.type(screen.getByRole('textbox', { name: 'Reason' }), 'Recorded twice');
    await user.click(screen.getByRole('button', { name: 'Void payment' }));

    await findToast(heard('₪25 from Sara Khalid voided'));
    expect(screen.getByText('It counts in neither income nor the handover.')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'post /manage/spaces/7/payments/31/void',
    ]);
    expect(bodyOf(requests[0])).toEqual({ reason: 'Recorded twice' });
    expect(keysOf(invalidated)).toEqual([['space', 7]]);
  });

  it('says a retry is safe after no answer, and never sends the void again by itself', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let lost = true;
    const { requests } = renderDialog(() => (lost ? { failure: 'ERR_NETWORK' } : ok(VOIDED)));

    await user.type(screen.getByRole('textbox', { name: 'Reason' }), 'Recorded twice');
    await user.click(screen.getByRole('button', { name: 'Void payment' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No answer came back. Try again — voiding it twice changes nothing.',
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(requests).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Reason' })).toHaveValue('Recorded twice');

    lost = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await findToast(heard('₪25 from Sara Khalid voided'));
    expect(requests.map(({ headers }) => headers.get('Idempotency-Key'))).toEqual([
      undefined,
      undefined,
    ]);
  });

  it('words a written-off visit’s payment and a payment gone, which reads the space again', async () => {
    const user = userEvent.setup();
    let answer = refused(409, { type: 'conflict', code: 'VISIT_WRITTEN_OFF' });
    const { invalidated } = renderDialog(() => answer);

    await user.type(screen.getByRole('textbox', { name: 'Reason' }), 'Recorded twice');
    await user.click(screen.getByRole('button', { name: 'Void payment' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The payment wasn’t voided. A payment of a written-off visit can’t be voided.',
    );

    answer = refused(404, { type: 'not_found' });
    invalidated.mockClear();
    await user.click(screen.getByRole('button', { name: 'Void payment' }));
    expect(await screen.findByText(/This payment no longer exists\./)).toBeInTheDocument();
    expect(keysOf(invalidated)).toEqual(expect.arrayContaining([['space', 7], ['me']]));
  });

  it('words a 403 shown by mistake as no longer open, and reads the user’s spaces again', async () => {
    const user = userEvent.setup();
    const { invalidated } = renderDialog(() => refused(403, { type: 'forbidden' }));

    await user.type(screen.getByRole('textbox', { name: 'Reason' }), 'Recorded twice');
    await user.click(screen.getByRole('button', { name: 'Void payment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The payment wasn’t voided. This is no longer open to you at this space.',
    );
    expect(keysOf(invalidated)).toEqual([['me']]);
  });
});
