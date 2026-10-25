import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { customerRow } from '../../../../test/deskCustomer';
import { startPreferences } from '../../../../test/startPreferences';
import { useCustomerCard } from './useCustomerCard';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (line: string) => line.replace(/[⁦-⁩]/g, '');

beforeEach(() => {
  startPreferences('en');
});

describe('useCustomerCard', () => {
  it('names the customer, their phone, their current subscription with its status and end, and what they owe', () => {
    const row = customerRow({
      debtAgorot: 3660,
      current: { id: 1, name: 'Exams', packageId: 4, endsOn: '2026-10-21', status: 'EXPIRED' },
    });
    const { result } = renderHook(() => useCustomerCard(row));

    expect(result.current).toMatchObject({
      key: '4',
      name: 'Sara Khalid',
      phone: { text: '+970599000201', number: true },
      subscription: { name: 'Exams', status: { label: 'Expired', tone: 'neutral' } },
      balance: { tone: 'warning' },
    });
    expect(heard(result.current.subscription?.until ?? '')).toBe('until 21 October');
    expect(heard(result.current.balance.label)).toBe('Owes ₪36.60');
    expect(heard(result.current.receive ?? '')).toBe('Receive ₪36.60');
  });

  it('says there is no phone, no subscription, or no end date', () => {
    const none = renderHook(() => useCustomerCard(customerRow({ phone: null, current: null })));
    expect(none.result.current.phone).toEqual({ text: 'No mobile number', number: false });
    expect(none.result.current.subscription).toBeNull();
    expect(none.result.current.noSubscription).toBe('No subscription');
    expect(none.result.current.balance).toEqual({ label: 'Settled', tone: 'neutral' });
    expect(none.result.current.receive).toBeNull();

    const open = renderHook(() =>
      useCustomerCard(
        customerRow({
          current: { id: 2, name: '20 hours', packageId: null, endsOn: null, status: 'ACTIVE' },
        }),
      ),
    );
    expect(open.result.current.subscription).toMatchObject({
      status: { label: 'Active', tone: 'success' },
      until: 'No end date',
    });
  });
});
