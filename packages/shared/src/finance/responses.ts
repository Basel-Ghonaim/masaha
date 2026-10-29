import type { PaginationMeta } from '../core/index.ts';

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

/**
 * A customer who owes, or who is in credit, with the amount: who owes with the item still owing
 * made first, and the Gaza day it was made; `null` in credit.
 */
export interface BalanceRow {
  customer: { id: number; name: string; phone: string | null; archived: boolean };
  amountAgorot: number;
  oldestItem: {
    kind: 'VISIT' | 'SUBSCRIPTION';
    id: number;
    /** A visit's visitor, else its customer; a subscription's name. */
    name: string | null;
    since: string;
  } | null;
}

/**
 * The debts list's `meta`: its pagination, the space's totals — what is owed and in credit, each
 * with how many customers, and the uncollected visits, the desk's list — and its reminder template,
 * `null` for the catalogue's default. An auto-closed visit left to a customer is in both `owed` and
 * `uncollected`: the two are never added.
 */
export type DebtsMeta = PaginationMeta & {
  totals: {
    owed: { agorot: number; customers: number };
    credit: { agorot: number; customers: number };
    uncollected: { visits: number; owedAgorot: number; unpriced: number };
  };
  reminderTemplate: string | null;
};

/** A customer who paid in a month: what they paid then, and when they last paid. */
export interface Payer {
  customer: { id: number; name: string };
  paidAgorot: number;
  lastPaidAt: string;
}

/**
 * A space's occupancy statistics, from closed stays only (visits and subscription check-ins, the
 * auto check-out's included): the month's average stay in whole minutes, its peak hour (0–23) and
 * its average daily attendance (one decimal), each `null` without stays; visits and members per
 * Gaza day over the 14 days ending today (a member once a day); and the average present per Gaza
 * weekday (0 = Sunday) and hour over the 28 days before today (one decimal).
 */
export interface OccupancyReport {
  month: string;
  averageStayMinutes: { all: number | null; members: number | null; visits: number | null };
  peakHour: number | null;
  averageDailyAttendance: number | null;
  byDay: { date: string; visits: number; members: number }[];
  byHour: { weekday: number; hours: number[] }[];
}
