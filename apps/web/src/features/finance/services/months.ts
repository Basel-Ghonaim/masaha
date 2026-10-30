import { addMonths, gazaClockOf, monthOf } from '@masaha/shared/core';
import { FINANCE_MONTHS_BACK } from '@masaha/shared/finance';

/** The current Gaza month at `now`, `YYYY-MM`. */
export function currentMonth(now: Date): string {
  return monthOf(gazaClockOf(now).date);
}

/**
 * The months finance offers at `now`, newest first: the current Gaza month and the 23 before it
 * (`FINANCE_MONTHS_BACK`), as the server reads them; never a month ahead.
 */
export function financeMonths(now: Date): string[] {
  const current = currentMonth(now);
  return Array.from({ length: FINANCE_MONTHS_BACK + 1 }, (_, back) => addMonths(current, -back));
}
