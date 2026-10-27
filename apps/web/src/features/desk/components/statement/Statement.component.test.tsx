import type { SubscriptionStatement } from '@masaha/shared/desk';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { customerFile, subscriptionState } from '../../../../test/deskCustomer';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { paymentRow } from '../../../../test/paymentRow';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { CustomerFile } from '../file/CustomerFile';

const SUBSCRIPTION = {
  ...subscriptionState({ id: 3, name: 'Every other day' }),
  paidAgorot: 10000,
  balanceAgorot: 0,
};

const STATEMENT: SubscriptionStatement = {
  ...SUBSCRIPTION,
  customer: { id: 4, name: 'Sara Khalid', phone: null },
  checkIns: [
    {
      id: 1,
      checkedInAt: '2026-10-20T06:00:00Z',
      checkedOutAt: '2026-10-20T08:30:00Z',
      checkoutMethod: 'AUTO',
      minutes: 150,
    },
  ],
  payments: [
    {
      id: 8,
      amountAgorot: 10000,
      method: 'CASH',
      note: null,
      receivedAt: '2026-10-02T09:00:00Z',
      recordedById: 14,
      voided: { at: '2026-10-03T09:00:00Z', byId: 14, reason: 'Entered twice' },
    },
  ],
  renewal: null,
  renewedById: null,
};

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.unstubAllGlobals();
  restoreTransport();
});

describe('Statement', () => {
  it.each([390, 1440])(
    'opens in its card, controlled by «Show the statement», a voided payment struck; axe-clean at %i',
    async (width) => {
      stubScreenWidth(width);
      const user = userEvent.setup();
      fakeTransport((request) =>
        request.url === '/manage/spaces/7/subscriptions/3'
          ? ok(STATEMENT)
          : ok(customerFile({ subscriptions: [SUBSCRIPTION] })),
      );
      const { container } = render(
        <QueryClientProvider client={createQueryClient()}>
          <main>
            <h1>Sara Khalid</h1>
            <CustomerFile spaceId={7} customerId={4} owner subscribe={() => undefined} />
          </main>
        </QueryClientProvider>,
      );

      const toggle = await screen.findByRole('button', { name: 'Show the statement' });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(toggle).toHaveAccessibleName('Hide the statement');
      const statement = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
      expect(statement).not.toBeNull();
      const payments = await within(statement as HTMLElement).findByRole('heading', {
        level: 4,
        name: 'Payments',
      });
      expect(payments).toBeVisible();
      expect(within(statement as HTMLElement).getByText('Voided')).toBeVisible();
      expect(within(statement as HTMLElement).getByText('Voided: Entered twice')).toBeVisible();
      expect(within(statement as HTMLElement).getByText('Auto check-out')).toBeVisible();
      expect(await axe(container)).toHaveNoViolations();
    },
  );
});

/** A statement with a payment not voided (₪50, id 7) beside the voided one; `voided` voids it too. */
function statementWith(voided: boolean): SubscriptionStatement {
  const payment = STATEMENT.payments[0];
  if (payment === undefined) throw new Error('the statement has a payment');
  return {
    ...STATEMENT,
    payments: [
      {
        ...payment,
        id: 7,
        amountAgorot: 5000,
        receivedAt: '2026-10-01T09:00:00Z',
        voided: voided ? { at: '2026-10-27T09:00:00Z', byId: 14, reason: 'Twice' } : null,
      },
      payment,
    ],
  };
}

/** A customer's file with one subscription, its statement opened; the void's answer voids the payment. */
async function openStatement(owner: boolean) {
  let voided = false;
  const requests = fakeTransport((request) => {
    if (request.method === 'post') {
      voided = true;
      return ok(paymentRow({ id: 7 }));
    }
    return request.url === '/manage/spaces/7/subscriptions/3'
      ? ok(statementWith(voided))
      : ok(customerFile({ subscriptions: [SUBSCRIPTION] }));
  });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <main>
        <h1>Sara Khalid</h1>
        <CustomerFile spaceId={7} customerId={4} owner={owner} subscribe={() => undefined} />
      </main>
    </QueryClientProvider>,
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Show the statement' }));
  const payments = await screen.findByRole('heading', { level: 4, name: 'Payments' });
  return { requests, payments };
}

/** A «⋯» of a payment, its name heard without the isolates. */
const paymentActions = () =>
  screen
    .queryAllByRole('button')
    .filter((button) =>
      (button.getAttribute('aria-label') ?? '').replace(/[⁦-⁩]/g, '').startsWith('Payment actions'),
    );

describe('Statement › a payment’s void', () => {
  it('offers the owner «⋯» on the payment not voided only; reception none', async () => {
    stubScreenWidth(1440);
    await openStatement(true);
    await waitFor(() => {
      expect(paymentActions()).toHaveLength(1);
    });
    expect(paymentActions()[0]?.getAttribute('aria-label')?.replace(/[⁦-⁩]/g, '')).toBe(
      'Payment actions: ₪50 · Sara Khalid',
    );
  });

  it('offers reception no «⋯»', async () => {
    stubScreenWidth(1440);
    await openStatement(false);
    expect(await screen.findByText('Voided: Entered twice')).toBeVisible();
    expect(paymentActions()).toHaveLength(0);
  });

  it('gives the focus to the payments’ heading once the voided payment’s «⋯» leaves', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    const { requests, payments } = await openStatement(true);

    await waitFor(() => {
      expect(paymentActions()).toHaveLength(1);
    });
    await user.click(paymentActions()[0] as HTMLElement);
    await user.click(await screen.findByRole('menuitem', { name: 'Void payment…' }));
    await user.type(await screen.findByRole('textbox', { name: 'Reason' }), 'Twice');
    await user.click(screen.getByRole('button', { name: 'Void payment' }));

    // The answer lands, the statement is read again with the payment voided, and its «⋯» leaves.
    await waitFor(() => {
      expect(paymentActions()).toHaveLength(0);
    });
    await waitFor(() => {
      expect(payments).toHaveFocus();
    });
    expect(requests.filter(({ method }) => method === 'post').map(({ url }) => url)).toEqual([
      '/manage/spaces/7/payments/7/void',
    ]);
  });
});
