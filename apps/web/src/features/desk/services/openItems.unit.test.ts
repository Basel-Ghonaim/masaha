import type { CustomerFile, SubscriptionWithMoney, UnpaidVisit } from '@masaha/shared/desk';
import { describe, expect, it } from 'vitest';
import { subscriptionState } from '../../../test/deskCustomer';
import { deskVisit } from '../../../test/deskVisit';
import { openItems } from './openItems';

function unpaid(id: number, checkedOutAt: string, balance: number | null): UnpaidVisit {
  return {
    visit: deskVisit({
      id,
      checkedOutAt,
      charge:
        balance === null
          ? null
          : {
              amountAgorot: 2500,
              roundingRule: null,
              roundingMinutes: null,
              capApplied: null,
              typedById: null,
              reason: null,
            },
    }),
    payments: [],
    paidAgorot: balance === null ? 0 : 2500 - balance,
    balanceAgorot: balance,
  };
}

function owing(id: number, change: Partial<SubscriptionWithMoney> = {}): SubscriptionWithMoney {
  return {
    ...subscriptionState({ id, name: `Plan ${String(id)}` }),
    paidAgorot: 10000,
    balanceAgorot: 5000,
    ...change,
  };
}

function file(change: Partial<CustomerFile> = {}): CustomerFile {
  return {
    customer: { id: 4, name: 'Rami', phone: null, archivedAt: null },
    debtAgorot: 0,
    creditAgorot: 0,
    present: null,
    subscriptions: [],
    unpaidVisits: [],
    ...change,
  };
}

const visitLabel = (visit: { id: number }) => `Visit ${String(visit.id)}`;

describe('openItems', () => {
  it('lists the unpaid visits oldest first, the unpriced left out, then the subscriptions that owe', () => {
    const items = openItems(
      file({
        unpaidVisits: [
          unpaid(9, '2026-10-20T10:00:00.000Z', 1500),
          unpaid(4, '2026-10-06T10:00:00.000Z', 2500),
          unpaid(5, '2026-10-07T10:00:00.000Z', null),
        ],
        subscriptions: [owing(2), owing(3, { balanceAgorot: 0 })],
      }),
      { visitLabel },
    );

    expect(items).toEqual([
      {
        key: 'visit-4',
        item: { visitId: 4 },
        label: 'Visit 4',
        dueAgorot: 2500,
        paidAgorot: 0,
        leftAgorot: 2500,
        usage: false,
      },
      {
        key: 'visit-9',
        item: { visitId: 9 },
        label: 'Visit 9',
        dueAgorot: 2500,
        paidAgorot: 1000,
        leftAgorot: 1500,
        usage: false,
      },
      {
        key: 'subscription-2',
        item: { subscriptionId: 2 },
        label: 'Plan 2',
        dueAgorot: 15000,
        paidAgorot: 10000,
        leftAgorot: 5000,
        usage: false,
      },
    ]);
  });

  it('offers a usage-based subscription with nothing owed only when it is the one chosen', () => {
    const usage = owing(6, { billing: 'PER_HOUR', balanceAgorot: -300, dueAgorot: 9700 });

    expect(openItems(file({ subscriptions: [usage] }), { visitLabel })).toEqual([]);
    expect(
      openItems(file({ subscriptions: [usage] }), { visitLabel, chosen: 'subscription-6' }),
    ).toEqual([
      {
        key: 'subscription-6',
        item: { subscriptionId: 6 },
        label: 'Plan 6',
        dueAgorot: 9700,
        paidAgorot: 10000,
        leftAgorot: 0,
        usage: true,
      },
    ]);
  });
});
