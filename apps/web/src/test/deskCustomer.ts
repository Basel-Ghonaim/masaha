import type { CustomerRow } from '@masaha/shared/desk';

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
