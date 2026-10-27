import type { AuditPeriod } from '@masaha/shared/audit';
import { addDays, gazaClockOf, gazaInstant } from '@masaha/shared/core';

/** The days before today the last 30 days reach back: today is the 30th. */
const DAYS_BACK = 29;

/**
 * When an audit log's period starts at `now` (pure): the last 30 days from the Gaza midnight 29 days
 * before today, so whole Gaza days across a daylight-saving change; all time, `null`.
 */
export function auditPeriodStart(period: AuditPeriod, now: Date): Date | null {
  if (period === 'ALL') return null;
  return gazaInstant(addDays(gazaClockOf(now).date, -DAYS_BACK), 0);
}
