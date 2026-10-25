import type { CustomerFile, ReceivedPayment } from '@masaha/shared/desk';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { customerRow, customersPage, subscriptionState } from '../../../../test/deskCustomer';
import { deskVisit } from '../../../../test/deskVisit';
import { findToast } from '../../../../test/findToast';
import { bodyOf, fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { PayDialog } from '../../components/pay/PayDialog';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const KHALID = customerRow({ id: 8, name: 'Khalid', debtAgorot: 1500, current: null });
const RAMI = customerRow({ id: 5, name: 'Rami Salem', debtAgorot: 6500, current: null });

/** Rami owes ₪15 on a visit of 6 Oct and ₪50 on a fixed subscription. */
const RAMI_FILE: CustomerFile = {
  customer: { id: 5, name: 'Rami Salem', phone: null, archivedAt: null },
  debtAgorot: 6500,
  creditAgorot: 0,
  present: null,
  subscriptions: [
    {
      ...subscriptionState({ id: 2, customerId: 5, name: 'Two weeks' }),
      paidAgorot: 10000,
      balanceAgorot: 5000,
    },
  ],
  unpaidVisits: [
    {
      visit: deskVisit({
        id: 4,
        visitorName: 'Rami',
        customer: { id: 5, name: 'Rami Salem', phone: null },
        checkedInAt: '2026-10-06T09:00:00.000Z',
        checkedOutAt: '2026-10-06T12:00:00.000Z',
        checkoutMethod: 'MANUAL',
        charge: {
          amountAgorot: 1500,
          roundingRule: null,
          roundingMinutes: null,
          capApplied: null,
          typedById: null,
          reason: null,
        },
      }),
      payments: [],
      paidAgorot: 0,
      balanceAgorot: 1500,
    },
  ],
};

/** Sara's usage-based subscription, owing ₪36.60. */
const SARA_FILE: CustomerFile = {
  customer: { id: 1, name: 'Sara Khalid', phone: null, archivedAt: null },
  debtAgorot: 3660,
  creditAgorot: 0,
  present: null,
  subscriptions: [
    {
      ...subscriptionState({ id: 1, customerId: 1, billing: 'PER_HOUR', priceAgorot: 400 }),
      dueAgorot: 9660,
      paidAgorot: 6000,
      balanceAgorot: 3660,
    },
  ],
  unpaidVisits: [],
};

function received(amount: number, left: number): ReceivedPayment {
  return {
    visit: null,
    subscription: null,
    payment: {
      id: 41,
      amountAgorot: amount,
      method: 'CASH',
      note: null,
      receivedAt: '2026-10-25T09:00:00.000Z',
      recordedById: 15,
    },
    paidAgorot: amount,
    balanceAgorot: left,
  };
}

function renderDialog(
  target: { customerId?: number; itemKey?: string },
  answer: (request: Request) => FakeAnswer,
) {
  const requests = fakeTransport(answer);
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <PayDialog spaceId={7} target={target} presentIds={new Set([5])} onClose={onClose} />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { requests, onClose };
}

const payments = (requests: Request[]) => requests.filter(({ method }) => method === 'post');

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('usePayDialog', () => {
  it('lists the customers who owe, those present first', async () => {
    const { requests } = renderDialog({}, (request) =>
      request.url === '/manage/spaces/7/customers' ? customersPage([KHALID, RAMI]) : ok(RAMI_FILE),
    );

    const dialog = await screen.findByRole('dialog', { name: 'Receive a payment' });
    expect(await within(dialog).findByText('Customers who owe:')).toBeVisible();
    const names = within(dialog)
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(names[0]).toContain('Rami Salem');
    expect(names[1]).toContain('Khalid');
    expect(requests[0]?.params).toMatchObject({ payment: 'OWES' });
  });

  it('pays one item, with the opening’s key; the amount follows the item until typed', async () => {
    const user = userEvent.setup();
    const { requests, onClose } = renderDialog({}, (request) =>
      request.url === '/manage/spaces/7/customers'
        ? customersPage([KHALID, RAMI])
        : request.method === 'post'
          ? ok(received(1500, 0), 201)
          : ok(RAMI_FILE),
    );

    const rami = (await screen.findAllByRole('listitem'))[0] as HTMLElement;
    await user.click(within(rami).getByRole('button', { name: 'Choose' }));
    expect(
      await screen.findByRole('dialog', { name: heard('Receive a payment · Rami Salem') }),
    ).toBeVisible();

    const amount = screen.getByRole('textbox', { name: 'Received now (₪)' });
    expect(screen.getByRole('radio', { name: /Visit of/ })).toBeChecked();
    expect(amount).toHaveValue('15');
    await user.click(screen.getByRole('radio', { name: /Two weeks/ }));
    expect(amount).toHaveValue('50');
    await user.clear(amount);
    await user.type(amount, '20');
    await user.click(screen.getByRole('radio', { name: /Visit of/ }));
    expect(amount).toHaveValue('20');
    await user.click(screen.getByRole('radio', { name: /Two weeks/ }));

    await user.click(screen.getByRole('button', { name: heard('Record ₪20') }));
    await findToast(heard('Rami Salem · Two weeks · ₪0 left'));
    expect(onClose).toHaveBeenCalled();
    expect(payments(requests)).toHaveLength(1);
    expect(bodyOf(payments(requests)[0])).toEqual({
      subscriptionId: 2,
      amountAgorot: 2000,
      method: 'CASH',
    });
    expect(payments(requests)[0]?.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('keeps the key across a retry after no answer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let attempt = 0;
    const { requests } = renderDialog({ customerId: 5 }, (request) => {
      if (request.method !== 'post') return ok(RAMI_FILE);
      attempt += 1;
      return attempt <= 3 ? { failure: 'ERR_NETWORK' } : ok(received(1500, 0), 201);
    });

    await user.click(await screen.findByRole('button', { name: heard('Record ₪15') }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No answer came back. Try again — it won’t be recorded twice.',
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await findToast(heard('Rami Salem · Visit of 6 Oct · ₪0 left'));

    const keys = payments(requests).map(({ headers }) => headers.get('Idempotency-Key'));
    expect(keys).toHaveLength(4);
    expect(new Set(keys).size).toBe(1);
    vi.useRealTimers();
  });

  it('lets a usage-based item take more, as credit', async () => {
    const user = userEvent.setup();
    const { requests } = renderDialog({ customerId: 1, itemKey: 'subscription-1' }, (request) =>
      request.method === 'post' ? ok(received(5000, -1340), 201) : ok(SARA_FILE),
    );

    const amount = await screen.findByRole('textbox', { name: 'Received now (₪)' });
    expect(
      screen.getByText('Billed from attendance: anything extra becomes credit.'),
    ).toBeVisible();
    await user.clear(amount);
    await user.type(amount, '50');
    expect(screen.getByText(heard('₪13.40 becomes credit'))).toBeVisible();
    await user.click(screen.getByRole('button', { name: heard('Record ₪50') }));

    await findToast(heard('Sara Khalid · Exams by the hour · ₪0 left'));
    expect(bodyOf(payments(requests)[0])).toEqual({
      subscriptionId: 1,
      amountAgorot: 5000,
      method: 'CASH',
    });
  });

  it('says the customer owes nothing', async () => {
    renderDialog({ customerId: 5 }, () =>
      ok({ ...RAMI_FILE, subscriptions: [], unpaidVisits: [], debtAgorot: 0 }),
    );
    expect(await screen.findByText('This customer owes nothing.')).toBeVisible();
  });
});
