import type { OccupancyReport } from '@masaha/shared/finance';
import { describe, expect, it } from 'vitest';
import { occupancyCsv } from './occupancyCsv';

describe('occupancyCsv', () => {
  it('has a row per weekday, in the language’s week, with its 24 values', () => {
    const hours = Array.from({ length: 24 }, (_, hour) => (hour === 9 ? 2.5 : 0));
    const report = {
      byHour: Array.from({ length: 7 }, (_, weekday) => ({ weekday, hours })),
    } as OccupancyReport;

    const csv = occupancyCsv(report, { today: '2026-10-29', language: 'en', day: 'Day' });

    const lines = csv.text.replace('﻿', '').split('\r\n');
    expect(csv.name).toBe('masaha-occupancy-2026-10-29.csv');
    expect(lines).toHaveLength(8);
    expect(lines[0]).toBe(
      'Day,00,01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23',
    );
    expect(lines[1]).toBe('Sunday,0,0,0,0,0,0,0,0,0,2.5,0,0,0,0,0,0,0,0,0,0,0,0,0,0');
    expect(lines[1]?.split(',')).toHaveLength(25);
    expect(lines[7]?.startsWith('Saturday,')).toBe(true);
  });
});
