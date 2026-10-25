import type { ReceivedPayment } from '@masaha/shared/desk';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { uncollectedVisit } from '../../../../test/deskVisit';
import { findToast } from '../../../../test/findToast';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { CollectDialog } from '../../components/collect/CollectDialog';
import type { UncollectedItem } from '../../types/UncollectedItem';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

const ITEM: UncollectedItem = { uncollected: uncollectedVisit(), name: 'Khalid', day: '6 Oct' };

/** The payment's answer: `amount` agorot recorded in cash, `left` still owed. */
function paid(amount: number, left: number): ReceivedPayment {
  return {
    visit: ITEM.uncollected.visit,
    subscription: null,
    payment: {
      id: 41,
      amountAgorot: amount,
      method: 'CASH',
      note: null,
      receivedAt: '2026-10-08T09:00:00.000Z',
      recordedById: 15,
    },
    paidAgorot: amount,
    balanceAgorot: left,
  };
}

function renderDialog(answer: () => FakeAnswer) {
  const requests = fakeTransport(answer);
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <CollectDialog spaceId={7} item={ITEM} onClose={onClose} returnFocus={vi.fn()} />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { requests, onClose };
}

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

describe('useCollectDialog', () => {
  it('pays the visit what it owes, with the opening’s key', async () => {
    const user = userEvent.setup();
    const { requests, onClose } = renderDialog(() => ok(paid(2500, 0), 201));

    const amount = screen.getByRole('textbox', { name: 'Received now (₪)' });
    expect(amount).toHaveValue('25');
    expect(amount).toHaveFocus();
    await user.click(screen.getByRole('button', { name: heard('Record ₪25') }));

    await findToast(heard('Khalid · visit of 6 Oct'));
    expect(screen.getByText(heard('₪25 received in cash'))).toBeInTheDocument();
    const [post] = requests;
    expect(post?.url).toBe('/manage/spaces/7/payments');
    expect(bodyOf(post)).toEqual({ visitId: 3, amountAgorot: 2500, method: 'CASH' });
    expect(post?.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the key across a retry after no answer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let attempt = 0;
    const { requests } = renderDialog(() => {
      attempt += 1;
      return attempt <= 3 ? { failure: 'ERR_NETWORK' } : ok(paid(2500, 0), 201);
    });

    await user.click(screen.getByRole('button', { name: heard('Record ₪25') }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No answer came back. Try again — it won’t be recorded twice.',
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await findToast(heard('Khalid · visit of 6 Oct'));
    const keys = requests.map(({ headers }) => headers.get('Idempotency-Key'));
    expect(keys).toHaveLength(4);
    expect(new Set(keys).size).toBe(1);
  });

  it('asks the phone for a remainder on a visit with no customer', async () => {
    const user = userEvent.setup();
    const { requests } = renderDialog(() => ok(paid(1000, 1500), 201));

    const amount = screen.getByRole('textbox', { name: 'Received now (₪)' });
    expect(screen.queryByRole('textbox', { name: 'Mobile number' })).toBeNull();
    await user.clear(amount);
    await user.type(amount, '10');
    expect(screen.getByText(heard('₪15 stays owed by Khalid'))).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Khalid');

    await user.click(screen.getByRole('button', { name: heard('Record ₪10') }));
    expect(
      await screen.findByText(
        'A mobile number is needed to record the debt, e.g. +970 59 000 0000',
      ),
    ).toBeInTheDocument();
    expect(requests).toHaveLength(0);

    await user.type(screen.getByRole('textbox', { name: 'Mobile number' }), '0599000303');
    await user.click(screen.getByRole('button', { name: heard('Record ₪10') }));

    await findToast(heard('Khalid · visit of 6 Oct'));
    expect(bodyOf(requests[0])).toEqual({
      visitId: 3,
      amountAgorot: 1000,
      method: 'CASH',
      phone: '+970599000303',
      customerName: 'Khalid',
    });
    expect(
      screen.getByText(heard('₪10 received in cash · ₪15 stays owed by Khalid')),
    ).toBeInTheDocument();
  });

  it('words VISIT_WRITTEN_OFF and VISIT_NOT_PRICED', async () => {
    const user = userEvent.setup();
    let answer = refused(409, { type: 'conflict', code: 'VISIT_WRITTEN_OFF' });
    renderDialog(() => answer);

    await user.click(screen.getByRole('button', { name: heard('Record ₪25') }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nothing was recorded. This visit was written off; the owner must undo the write-off before it takes a payment or one of its payments is voided.',
    );

    answer = refused(409, { type: 'conflict', code: 'VISIT_NOT_PRICED' });
    await user.click(screen.getByRole('button', { name: heard('Record ₪25') }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nothing was recorded. This visit has no price yet; it is priced first.',
    );
  });
});
