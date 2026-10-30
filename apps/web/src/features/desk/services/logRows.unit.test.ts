import { describe, expect, it } from 'vitest';
import { deskCheckIn, subscriptionState } from '../../../test/deskCustomer';
import { deskVisit } from '../../../test/deskVisit';
import { logRows } from './logRows';

describe('logRows', () => {
  it('merges visits and check-ins latest first, each in one shape', () => {
    const visits = [
      deskVisit({
        id: 12,
        visitorName: 'Omar',
        audience: 'STUDENT',
        checkedInAt: '2026-10-25T09:00:00.000Z',
        checkedOutAt: '2026-10-25T10:00:00.000Z',
        checkoutMethod: 'AUTO',
        writeOff: { at: '2026-10-25T11:00:00.000Z', byId: 2, reason: 'Left' },
      }),
      deskVisit({
        id: 11,
        visitorName: 'Lina',
        customer: { id: 9, name: 'Lina Saleh', phone: null },
        checkedInAt: '2026-10-25T06:00:00.000Z',
      }),
    ];
    const checkIns = [
      deskCheckIn({
        id: 3,
        checkedInAt: '2026-10-25T07:30:00.000Z',
        subscription: subscriptionState({ name: 'Monthly' }),
      }),
    ];

    expect(logRows(visits, checkIns)).toEqual([
      {
        key: 'visit-12',
        kind: 'VISIT',
        name: 'Omar',
        customerId: null,
        subscription: null,
        student: true,
        checkedInAt: '2026-10-25T09:00:00.000Z',
        checkedOutAt: '2026-10-25T10:00:00.000Z',
        checkoutMethod: 'AUTO',
        writtenOff: true,
      },
      {
        key: 'check-in-3',
        kind: 'CHECK_IN',
        name: 'Sara Khalid',
        customerId: 4,
        subscription: 'Monthly',
        student: false,
        checkedInAt: '2026-10-25T07:30:00.000Z',
        checkedOutAt: null,
        checkoutMethod: null,
        writtenOff: false,
      },
      {
        key: 'visit-11',
        kind: 'VISIT',
        name: 'Lina Saleh',
        customerId: 9,
        subscription: null,
        student: false,
        checkedInAt: '2026-10-25T06:00:00.000Z',
        checkedOutAt: null,
        checkoutMethod: null,
        writtenOff: false,
      },
    ]);
  });

  it('orders two stays that came in at once by the later id first', () => {
    const at = '2026-10-25T07:00:00.000Z';
    const rows = logRows(
      [deskVisit({ id: 4, checkedInAt: at })],
      [deskCheckIn({ id: 8, checkedInAt: at })],
    );
    expect(rows.map((row) => row.key)).toEqual(['check-in-8', 'visit-4']);
  });
});
