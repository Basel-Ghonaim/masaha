import type { CustomerFile } from '@masaha/shared/desk';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { customerFile, subscriptionState } from '../../../../test/deskCustomer';
import { deskVisit } from '../../../../test/deskVisit';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useCustomerFile } from './useCustomerFile';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (line: string | undefined | null) => line?.replace(/[⁦-⁩]/g, '');

function renderFile(file: CustomerFile | (() => ReturnType<typeof refused>)) {
  fakeTransport(() => (typeof file === 'function' ? file() : ok(file)));
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useCustomerFile(7, 4), { wrapper });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useCustomerFile', () => {
  it('says the header’s balance as the one badge does, who is here, and the archive', async () => {
    const { result } = renderFile(
      customerFile({
        customer: { id: 4, name: 'Sara Khalid', phone: null, archivedAt: '2026-10-20T08:00:00Z' },
        debtAgorot: 5000,
        present: { kind: 'VISIT', id: 3, since: '2026-10-25T08:00:00Z' },
      }),
    );
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    const { header } = result.current;
    expect(heard(header?.balance.view.label)).toBe('Owes ₪50');
    expect(header?.balance.view.tone).toBe('warning');
    expect(header?.here).toBe('Here now');
    expect(header?.archived).toBe('Archived');
    expect(header?.phone).toEqual({ text: 'No mobile number', number: false });
  });

  it('says each subscription’s due, paid and left as the server answers them', async () => {
    const { result } = renderFile(
      customerFile({
        subscriptions: [
          // The server's left, not the due less the paid: a payment it allocated elsewhere counts.
          { ...subscriptionState({ id: 1 }), paidAgorot: 10000, balanceAgorot: 3000 },
          {
            ...subscriptionState({ id: 2, billing: 'PER_HOUR', priceAgorot: 400, dueAgorot: 9660 }),
            paidAgorot: 0,
            balanceAgorot: 9660,
          },
        ],
      }),
    );
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    const [fixed, usage] = result.current.subscriptions.cards;
    expect(heard(fixed?.money.due)).toBe('₪150');
    expect(heard(fixed?.money.paid)).toBe('₪100');
    expect(heard(fixed?.money.left)).toBe('₪30');
    expect(fixed?.money.dueLabel).toBe('Due');
    expect(fixed?.badges.pay).toEqual({ label: 'Partly paid', tone: 'warning' });
    expect(usage?.money.dueLabel).toBe('Due so far');
    expect(usage?.badges.pay).toEqual({ label: 'Unpaid', tone: 'destructive' });
  });

  it('offers «Receive what’s left» only on a subscription that owes, opening its payment', async () => {
    const { result } = renderFile(
      customerFile({
        subscriptions: [
          { ...subscriptionState({ id: 1 }), paidAgorot: 15000, balanceAgorot: 0 },
          { ...subscriptionState({ id: 2 }), paidAgorot: 5000, balanceAgorot: 10000 },
        ],
      }),
    );
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    const [paid, owing] = result.current.subscriptions.cards;
    expect(paid?.receive).toBeNull();
    expect(owing?.receive?.label).toBe('Receive what’s left');
    act(() => {
      owing?.receive?.run();
    });
    expect(result.current.pay).toEqual({ customerId: 4, itemKey: 'subscription-2' });
  });

  it('lists the unpaid visits, «Collect» on a priced one, an unpriced one said so', async () => {
    const closed = { checkedOutAt: '2026-10-24T15:00:00Z', checkoutMethod: 'AUTO' as const };
    const { result } = renderFile(
      customerFile({
        debtAgorot: 1500,
        unpaidVisits: [
          {
            visit: deskVisit({
              id: 3,
              ...closed,
              charge: {
                amountAgorot: 2500,
                roundingRule: null,
                roundingMinutes: null,
                capApplied: null,
                typedById: null,
                reason: null,
              },
            }),
            payments: [],
            paidAgorot: 1000,
            balanceAgorot: 1500,
          },
          {
            visit: deskVisit({ id: 5, ...closed }),
            payments: [],
            paidAgorot: 0,
            balanceAgorot: null,
          },
        ],
      }),
    );
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    const [priced, unpriced] = result.current.unpaid?.rows ?? [];
    expect(heard(priced?.amount)).toBe('₪15');
    expect(priced?.collect?.label).toBe('Collect');
    expect(unpriced?.amount).toBe('Not priced yet');
    expect(unpriced?.collect).toBeNull();
    act(() => {
      priced?.collect?.run();
    });
    expect(result.current.pay).toEqual({ customerId: 4, itemKey: 'visit-3' });
  });

  it('says a customer the space does not hold is not found, apart from a failure', async () => {
    const { result } = renderFile(() => refused(404, { type: 'not_found' }));

    await waitFor(() => {
      expect(result.current.state).toBe('notFound');
    });
    expect(result.current.notFound.title).toBe('We couldn’t find this customer');
  });
});
