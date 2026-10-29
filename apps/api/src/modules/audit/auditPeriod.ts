import type { AuditPeriod } from '@masaha/shared/audit';
import { lastDaysSince } from '@masaha/shared/core';

/** How many Gaza days the last 30 days hold: today and the 29 before it. */
const LAST_DAYS = 30;

/**
 * When an audit log's period starts at `now` (pure): the last 30 days from the Gaza midnight 29 days
 * before today, so whole Gaza days across a daylight-saving change (`lastDaysSince`); all time,
 * `null`.
 */
export function auditPeriodStart(period: AuditPeriod, now: Date): Date | null {
  if (period === 'ALL') return null;
  return lastDaysSince(now, LAST_DAYS);
}
