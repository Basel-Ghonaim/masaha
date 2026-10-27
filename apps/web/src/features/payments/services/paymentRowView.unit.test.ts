import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { paymentRow } from '../../../test/paymentRow';
import { paymentRowView } from './paymentRowView';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (line: string | undefined) => line?.replace(/[⁦-⁩]/g, '');

const NOW = new Date('2026-10-21T12:00:00.000Z');
const view = (change: Parameters<typeof paymentRow>[0], language: 'en' | 'ar' = 'en') =>
  paymentRowView(paymentRow(change), { language, now: NOW, copy: CATALOGUES[language] });

describe('paymentRowView', () => {
  it('says the day and the time on Gaza’s clock', () => {
    // 21:30 UTC on the 20th is 00:30 on the 21st in Gaza (UTC+3 in October).
    const late = view({ receivedAt: '2026-10-20T21:30:00.000Z' });
    expect([late.day, late.time]).toEqual(['today', '00:30']);
    const before = view({ receivedAt: '2026-10-04T07:30:00.000Z' }, 'ar');
    expect([before.day, before.time]).toEqual(['4 أكتوبر', '10:30']);
  });

  it('names the customer, else the visitor, else «Visitor»', () => {
    expect(view({}).who).toBe('Sara Khalid');
    expect(view({}).customerId).toBe(4);
    const visit = view({ customer: null, item: { kind: 'VISIT', id: 9, visitorName: 'Omar' } });
    expect([visit.who, visit.customerId, visit.item]).toEqual(['Omar', null, 'Visit']);
    const nameless = view({ customer: null, item: { kind: 'VISIT', id: 9, visitorName: null } });
    expect(nameless.who).toBe('Visitor');
  });

  it('says a subscription’s name, the amount in ₪, its method and who recorded it', () => {
    const row = view({ amountAgorot: 12550, method: 'TRANSFER' });
    expect([row.item, heard(row.amount), row.method, row.recorder]).toEqual([
      'Every other day',
      '₪125.50',
      'Transfer',
      'Laila',
    ]);
    expect(row.voided).toBeNull();
    expect(row.payment).toEqual({
      id: 31,
      amountAgorot: 12550,
      method: 'TRANSFER',
      receivedAt: '2026-10-21T07:30:00.000Z',
      who: 'Sara Khalid',
      voided: false,
    });
  });

  it('marks a voided one with its badge and who voided it and why', () => {
    const row = view(
      {
        voided: {
          at: '2026-10-21T09:00:00.000Z',
          by: { id: 14, name: 'أحمد الشوا' },
          reason: 'دفعة تجربة',
        },
      },
      'ar',
    );
    expect(row.voided?.label).toBe('ملغاة');
    expect(heard(row.voided?.line)).toBe('ألغاها أحمد الشوا: دفعة تجربة');
    expect(row.payment.voided).toBe(true);
  });
});
