import { describe, expect, it } from 'vitest';

import { auditPeriodStart } from './auditPeriod.ts';

// Gaza moved from +03:00 to +02:00 on 2026-10-24 at 02:00 (core/gazaTime.unit.test.ts).

describe("the audit logs' period", () => {
  it('the last 30 days start at the Gaza midnight 29 days before today, across a daylight-saving change; all time has no start', () => {
    // Today 2026-11-10, in winter; 2026-10-12 was in summer: its midnight is +03:00.
    expect(
      auditPeriodStart('LAST_30_DAYS', new Date('2026-11-10T10:00:00+02:00'))?.toISOString(),
    ).toBe('2026-10-11T21:00:00.000Z');
    // Just after Gaza's midnight, today is already the 11th.
    expect(auditPeriodStart('LAST_30_DAYS', new Date('2026-11-10T22:30:00Z'))?.toISOString()).toBe(
      '2026-10-12T21:00:00.000Z',
    );
    // Both in winter.
    expect(
      auditPeriodStart('LAST_30_DAYS', new Date('2026-12-30T10:00:00+02:00'))?.toISOString(),
    ).toBe('2026-11-30T22:00:00.000Z');
    expect(auditPeriodStart('ALL', new Date('2026-11-10T10:00:00+02:00'))).toBeNull();
  });
});
