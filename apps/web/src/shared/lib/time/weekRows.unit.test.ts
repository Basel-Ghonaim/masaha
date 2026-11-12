import type { OpeningRange } from '@masaha/shared/spaces';
import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { weekRows } from './weekRows';

const WORDS = CATALOGUES.ar.directory.page.hours;
const LRI = '⁦';
const PDI = '⁩';
const range = (text: string) => `${LRI}${text}${PDI}`;
const open = (opensMinute: number, closesMinute: number): OpeningRange => ({
  opensMinute,
  closesMinute,
});

// Sunday (0) to Saturday (6).
const SUN_TO_THU = open(480, 1320);
const WEEK = [SUN_TO_THU, SUN_TO_THU, SUN_TO_THU, SUN_TO_THU, SUN_TO_THU, null, SUN_TO_THU];
// 2026-10-22 is a Thursday in Gaza; 21:30 UTC that day is 00:30 on Friday there.
const THURSDAY = new Date('2026-10-22T10:00:00Z');
const PAST_MIDNIGHT = new Date('2026-10-22T21:30:00Z');

describe('weekRows', () => {
  it('Saturday first; equal days grouped as a run; today on Gaza’s calendar', () => {
    expect(weekRows(WEEK, THURSDAY, WORDS, false)).toEqual({
      rows: [
        {
          key: 'sat',
          label: 'السبت – الخميس',
          value: range('08:00–22:00'),
          today: true,
          closed: false,
        },
        { key: 'fri', label: 'الجمعة', value: 'مغلقة', today: false, closed: true },
      ],
      canExpand: false,
    });
    const friday = weekRows(WEEK, PAST_MIDNIGHT, WORDS, false);
    expect(friday.rows.map((row) => row.today)).toEqual([false, true]);
  });

  it('a pair of equal days, around the clock, and every day on demand', () => {
    const days = [
      open(480, 1320),
      open(480, 1320),
      open(600, 1200),
      open(600, 1200),
      open(600, 1200),
      null,
      open(0, 1440),
    ];
    const grouped = weekRows(days, THURSDAY, WORDS, false);
    expect(grouped.rows.map((row) => [row.label, row.value])).toEqual([
      ['السبت', 'على مدار الساعة'],
      ['الأحد، الاثنين', range('08:00–22:00')],
      ['الثلاثاء – الخميس', range('10:00–20:00')],
      ['الجمعة', 'مغلقة'],
    ]);
    expect(grouped.canExpand).toBe(true);

    const all = weekRows(days, THURSDAY, WORDS, true);
    expect(all.rows.map((row) => row.label)).toEqual([
      'السبت',
      'الأحد',
      'الاثنين',
      'الثلاثاء',
      'الأربعاء',
      'الخميس',
      'الجمعة',
    ]);
    expect(all.rows.filter((row) => row.today).map((row) => row.key)).toEqual(['thu']);
    expect(all.canExpand).toBe(true);
  });
});
