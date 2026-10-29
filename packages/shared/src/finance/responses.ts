// The owner's finance answers (docs/api/api-contract.md › Finance). Every amount is whole agorot.

/** What was received in a window, the payments not voided, by the kind of item they paid. */
export interface IncomeSplit {
  subscriptionsAgorot: number;
  visitsAgorot: number;
  totalAgorot: number;
}

/** A staff member's collections in a month: how many payments, their sum, and by method. */
export interface Collections {
  recordedBy: { id: number; name: string };
  count: number;
  totalAgorot: number;
  byMethod: { CASH: number; TRANSFER: number };
}

/**
 * A month's income (the payments not voided, each on the Gaza day it was received): the month, the
 * month before it, today and all time (from the Gaza day of the first payment); the last 12 months
 * and the visits' last 30 days, oldest first, ending with the current month and today; and each
 * staff member's collections in the month, the largest first.
 */
export interface IncomeReport {
  month: string;
  income: IncomeSplit;
  previousMonth: IncomeSplit;
  today: IncomeSplit;
  allTime: IncomeSplit & { since: string | null };
  months: { month: string; income: IncomeSplit }[];
  visitsByDay: { date: string; agorot: number }[];
  collections: Collections[];
}
