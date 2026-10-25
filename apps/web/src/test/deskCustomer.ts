import type { CheckInCheckOut, CustomerFile, CustomerRow } from '@masaha/shared/desk';
import type { DeskCheckIn, SubscriptionState } from '@masaha/shared/subscriptions';

/** A customer of space 7 as the customers list answers them: an active package, settled. */
export function customerRow(change: Partial<CustomerRow> = {}): CustomerRow {
  return {
    id: 4,
    name: 'Sara Khalid',
    phone: '+970599000201',
    archivedAt: null,
    debtAgorot: 0,
    creditAgorot: 0,
    current: {
      id: 1,
      name: 'Exams by the hour',
      packageId: 4,
      endsOn: '2026-10-21',
      status: 'ACTIVE',
    },
    ...change,
  };
}

/** A page of the customers list, as the server answers it. */
export function customersPage(rows: CustomerRow[], total = rows.length) {
  return {
    status: 200,
    data: {
      success: true,
      data: rows,
      meta: {
        currentPage: 1,
        limit: 6,
        totalPages: Math.ceil(total / 6),
        totalRecords: total,
        hasNextPage: total > 6,
        hasPreviousPage: false,
      },
    },
  };
}

/** A subscription's state as the desk reads it: active, fixed ₪150, no limits. */
export function subscriptionState(change: Partial<SubscriptionState> = {}): SubscriptionState {
  return {
    id: 1,
    customerId: 4,
    packageId: 4,
    renewalOfId: null,
    name: 'Exams by the hour',
    startsOn: '2026-10-01',
    endsOn: '2026-10-30',
    totalDays: null,
    daysPerWeek: null,
    hoursPerDay: null,
    totalHours: null,
    billing: 'FIXED',
    priceAgorot: 15000,
    audience: 'GENERAL',
    shiftId: null,
    priceTyped: null,
    ended: null,
    status: 'ACTIVE',
    progress: { daysUsed: 2, daysThisWeek: 1, minutesUsed: 300, minutesToday: 0 },
    dueAgorot: 15000,
    ...change,
  };
}

/** Sara's open check-in at space 7, changed as a test needs. */
export function deskCheckIn(change: Partial<DeskCheckIn> = {}): DeskCheckIn {
  return {
    id: 3,
    customer: { id: 4, name: 'Sara Khalid', phone: '+970599000201' },
    subscription: subscriptionState(),
    checkedInAt: '2026-10-25T07:00:00.000Z',
    checkedOutAt: null,
    checkoutMethod: null,
    ...change,
  };
}

/** Sara's check-in closed after 2 h 05 m, with what her subscription was paid and still owes. */
export function checkedOut(balanceAgorot: number): CheckInCheckOut {
  return {
    ...deskCheckIn({ checkedOutAt: '2026-10-25T09:05:00.000Z', checkoutMethod: 'MANUAL' }),
    paidAgorot: 6000,
    balanceAgorot,
  };
}

/** Sara's file at space 7: settled, not present, one subscription paid in full, no unpaid visit. */
export function customerFile(change: Partial<CustomerFile> = {}): CustomerFile {
  return {
    customer: { id: 4, name: 'Sara Khalid', phone: '+970599000201', archivedAt: null },
    debtAgorot: 0,
    creditAgorot: 0,
    present: null,
    subscriptions: [{ ...subscriptionState(), paidAgorot: 15000, balanceAgorot: 0 }],
    unpaidVisits: [],
    ...change,
  };
}
