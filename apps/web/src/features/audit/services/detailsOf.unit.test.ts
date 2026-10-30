import { CATALOGUES } from '@shared/copy';
import { priceText } from '@shared/lib';
import { describe, expect, it } from 'vitest';
import { detailsOf, type DetailsWords } from './detailsOf';

const wordsOf = (language: 'ar' | 'en'): DetailsWords => {
  const copy = CATALOGUES[language];
  return {
    details: copy.audit.details,
    methods: copy.desk.money.methods,
    states: {
      AVAILABLE: copy.terms.liveStatuses.available,
      FULL: copy.terms.liveStatuses.full,
      CLOSED: copy.terms.liveStatuses.closedNow,
    },
  };
};

/** An entry's details in English, its values as each writer stores them (EC12). */
const en = (action: string, after: object | null, before: object | null = null) =>
  detailsOf(
    {
      action,
      before: before as Record<string, unknown> | null,
      after: after as Record<string, unknown> | null,
    },
    wordsOf('en'),
    'en',
  );

describe('detailsOf', () => {
  it("words a void's amount, method and reason", () => {
    expect(
      en('payment.voided', {
        visitId: 3,
        amountAgorot: 2500,
        method: 'CASH',
        reason: 'Typed twice',
      }),
    ).toBe('₪25 · Cash · reason: Typed twice');
    expect(
      detailsOf(
        {
          action: 'payment.voided',
          before: null,
          after: { subscriptionId: 4, amountAgorot: 1250, method: 'TRANSFER', reason: 'خطأ' },
        },
        wordsOf('ar'),
        'ar',
      ),
    ).toBe(`${priceText(1250, 'ar')} · تحويل · السبب: خطأ`);
  });

  it('words a payment, a check-out and a write-off by their stored amounts', () => {
    expect(en('payment.recorded', { visitId: 3, amountAgorot: 4000, method: 'TRANSFER' })).toBe(
      '₪40 · Transfer',
    );
    expect(en('visit.checkedOut', { chargeAgorot: 1500, reason: null, customerId: null })).toBe(
      '₪15',
    );
    expect(en('visit.checkedOut', { chargeAgorot: null })).toBeNull();
    expect(en('visit.autoCheckedOut', { checkedOutAt: 'x', chargeAgorot: 900 })).toBe('₪9');
    expect(en('visit.writtenOff', { reason: 'Left without paying', balanceAgorot: 1000 })).toBe(
      '₪10 · Left without paying',
    );
    expect(en('visit.priced', { chargeAgorot: 2000, reason: 'Late arrival' })).toBe(
      '₪20 · Late arrival',
    );
  });

  it('words a change from one value to another', () => {
    expect(
      en(
        'subscription.priceCorrected',
        { billing: 'FIXED', priceAgorot: 15000, reason: 'Discount' },
        { billing: 'FIXED', priceAgorot: 20000 },
      ),
    ).toBe('from ₪200 to ₪150 · Discount');
    expect(en('user.roleChanged', { role: 'OWNER' }, { role: 'USER' })).toBe('from User to Owner');
    expect(en('space.capacityEdited', { capacity: 40 }, { capacity: 30 })).toBe('from 30 to 40');
    expect(en('space.capacityEdited', { capacity: 40 }, { capacity: null })).toBeNull();
  });

  it('words an end, an extension, a status set by hand and a refusal’s note', () => {
    expect(
      en('subscription.ended', { endsOn: '2026-10-21', endedAt: 'x' }, { endsOn: '2026-11-01' }),
    ).toBe('Ended on 21 October 2026');
    expect(
      en('closure.subscriptionsExtended', { days: 3, subscriptionIds: [1, 2], renewalIds: [] }),
    ).toBe('2 subscriptions · 3 days');
    // 13:30 in Gaza (UTC+3 in October), whatever the zone the test runs in.
    expect(en('space.statusOverridden', { state: 'FULL', until: '2026-10-20T10:30:00.000Z' })).toBe(
      'Full · until 13:30',
    );
    expect(en('dataReport.dismissed', { note: 'Already correct' })).toBe('Already correct');
    expect(en('dataReport.dismissed', { note: null })).toBeNull();
  });

  it('says nothing where the stored values say nothing a person needs', () => {
    expect(en('customer.created', { name: 'Ali' })).toBeNull();
    expect(en('space.hoursEdited', null, null)).toBeNull();
    expect(en('payment.recorded', { amountAgorot: 'many' })).toBeNull();
  });
});
