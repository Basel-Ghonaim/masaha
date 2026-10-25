import type { SubscriptionStatement } from '@masaha/shared/desk';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { subscriptionState } from '../../../../test/deskCustomer';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useStatement } from './useStatement';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (line: string | null | undefined) => line?.replace(/[⁦-⁩]/g, '');

const PAYMENT = {
  amountAgorot: 10000,
  method: 'CASH' as const,
  note: null,
  recordedById: 14,
  voided: null,
};

const STATEMENT: SubscriptionStatement = {
  ...subscriptionState({ id: 3, name: 'Every other day' }),
  paidAgorot: 10000,
  balanceAgorot: 0,
  customer: { id: 4, name: 'Sara Khalid', phone: null },
  checkIns: [
    {
      id: 1,
      checkedInAt: '2026-10-20T06:00:00Z',
      checkedOutAt: '2026-10-20T08:30:00Z',
      checkoutMethod: 'MANUAL',
      minutes: 150,
    },
    {
      id: 2,
      checkedInAt: '2026-10-22T06:00:00Z',
      checkedOutAt: '2026-10-22T19:00:00Z',
      checkoutMethod: 'AUTO',
      minutes: 780,
    },
    {
      id: 3,
      checkedInAt: '2026-10-25T07:00:00Z',
      checkedOutAt: null,
      checkoutMethod: null,
      minutes: null,
    },
  ],
  payments: [
    { ...PAYMENT, id: 7, receivedAt: '2026-10-01T09:00:00Z' },
    {
      ...PAYMENT,
      id: 8,
      method: 'TRANSFER',
      receivedAt: '2026-10-02T09:00:00Z',
      voided: { at: '2026-10-03T09:00:00Z', byId: 14, reason: 'Entered twice' },
    },
  ],
  renewal: { startsOn: '2026-10-31' },
  renewedById: null,
};

function renderStatement() {
  const requests = fakeTransport(() => ok(STATEMENT));
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useStatement(7, 3), { wrapper }), requests };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useStatement', () => {
  it('is read only once opened, and toggles its words', async () => {
    const { result, requests } = renderStatement();

    expect(result.current.toggle).toMatchObject({ label: 'Show the statement', expanded: false });
    expect(requests).toHaveLength(0);
    act(() => {
      result.current.toggle.run();
    });
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(requests.map(({ url }) => url)).toEqual(['/manage/spaces/7/subscriptions/3']);
    expect(result.current.toggle).toMatchObject({ label: 'Hide the statement', expanded: true });
  });

  it('lists the check-ins, an open one «Here now», an auto check-out said so', async () => {
    const { result } = renderStatement();
    act(() => {
      result.current.toggle.run();
    });
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    const [first, auto, open] = result.current.checkIns.rows;
    expect([heard(first?.day), first?.in, first?.out, first?.duration]).toEqual([
      '20 October',
      '09:00',
      '11:30',
      '2:30',
    ]);
    expect(auto?.auto).toBe('Auto check-out');
    expect(first?.auto).toBeNull();
    expect(open?.out).toBe('Here now');
    expect(open?.duration).toBeNull();
    expect(heard(result.current.renewal)).toBe('A renewal would start on 31 October');
  });

  it('strikes a voided payment with «Voided» and its reason, never as paid', async () => {
    const { result } = renderStatement();
    act(() => {
      result.current.toggle.run();
    });
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    const [paid, voided] = result.current.payments.rows;
    expect([heard(paid?.amount), paid?.method, paid?.voided]).toEqual(['₪100', 'Cash', null]);
    expect(voided?.method).toBe('Transfer');
    expect(voided?.voided).toEqual({ label: 'Voided', reason: 'Voided: Entered twice' });
  });
});
