import { addDays } from '@masaha/shared/core';

/**
 * The last day of a subscription that starts on `start` and runs `validityDays`, both days counted:
 * the server's rule, shown only (the server sets the end).
 */
export function endOf(start: string, validityDays: number): string {
  return addDays(start, validityDays - 1);
}
