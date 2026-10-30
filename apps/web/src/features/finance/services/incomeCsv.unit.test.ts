import type { IncomeReport } from '@masaha/shared/finance';
import { describe, expect, it } from 'vitest';
import { incomeCsv } from './incomeCsv';

const split = (subscriptionsAgorot: number, visitsAgorot: number) => ({
  subscriptionsAgorot,
  visitsAgorot,
  totalAgorot: subscriptionsAgorot + visitsAgorot,
});

describe('incomeCsv', () => {
  it('writes one row per month, its amounts in shekels with a dot', () => {
    const report = {
      month: '2026-10',
      months: [
        { month: '2026-09', income: split(150_000, 2_550) },
        { month: '2026-10', income: split(0, 5) },
      ],
    } as IncomeReport;

    const csv = incomeCsv(report, {
      month: 'Month',
      subscriptions: 'Subscriptions',
      visits: 'Visits',
      total: 'Total',
    });

    expect(csv.name).toBe('masaha-income-2026-10.csv');
    expect(csv.text).toBe(
      '﻿Month,Subscriptions,Visits,Total\r\n2026-09,1500.00,25.50,1525.50\r\n2026-10,0.00,0.05,0.05',
    );
  });
});
