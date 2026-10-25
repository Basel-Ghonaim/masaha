import { describe, expect, it } from 'vitest';
import { payStatus } from './payStatus';

describe('payStatus', () => {
  it('is paid when nothing is owed, partly paid when something was paid, else unpaid', () => {
    expect(payStatus({ paidAgorot: 15000, balanceAgorot: 0 })).toEqual({
      key: 'paid',
      tone: 'success',
    });
    // A usage-based subscription paid ahead holds credit: nothing is owed.
    expect(payStatus({ paidAgorot: 2000, balanceAgorot: -500 })).toEqual({
      key: 'paid',
      tone: 'success',
    });
    expect(payStatus({ paidAgorot: 10000, balanceAgorot: 5000 })).toEqual({
      key: 'partial',
      tone: 'warning',
    });
    expect(payStatus({ paidAgorot: 0, balanceAgorot: 5000 })).toEqual({
      key: 'unpaid',
      tone: 'destructive',
    });
  });
});
