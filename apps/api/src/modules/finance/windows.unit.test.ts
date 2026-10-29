import { describe, expect, it } from 'vitest';

import {
  dayWindow,
  daysEnding,
  fourWeeksBefore,
  hourSlots,
  monthError,
  monthsEnding,
  monthWindow,
} from './windows.ts';

// Finance's windows, each a pair of instants on Gaza's calendar (S1). Gaza is UTC+3 until the
// 2026-10-24 change at 02:00, then UTC+2. Now is Thursday 2026-10-29, 10:00 in Gaza.
const NOW = new Date('2026-10-29T10:00:00+02:00');

describe("finance's windows", () => {
  it('a month from its Gaza midnight to the next; 23 months back the earliest, the next month out of range', () => {
    expect(monthWindow('2026-10')).toEqual({
      from: new Date('2026-10-01T00:00:00+03:00'),
      to: new Date('2026-11-01T00:00:00+02:00'),
    });
    expect(monthWindow('2026-12')).toEqual({
      from: new Date('2026-12-01T00:00:00+02:00'),
      to: new Date('2027-01-01T00:00:00+02:00'),
    });
    expect(monthError('2026-10', NOW)).toBeNull();
    expect(monthError('2024-11', NOW)).toBeNull();
    expect(monthError('2024-10', NOW)).toBe('out_of_range');
    expect(monthError('2026-11', NOW)).toBe('out_of_range');
    // On a month's first Gaza day, before UTC's: already that month.
    expect(monthError('2026-11', new Date('2026-11-01T00:30:00+02:00'))).toBeNull();
  });

  it('one day, from Gaza midnight to the next', () => {
    expect(dayWindow('2026-10-29')).toEqual({
      from: new Date('2026-10-29T00:00:00+02:00'),
      to: new Date('2026-10-30T00:00:00+02:00'),
    });
    // The autumn change: a day of 25 hours.
    expect(dayWindow('2026-10-24')).toEqual({
      from: new Date('2026-10-24T00:00:00+03:00'),
      to: new Date('2026-10-25T00:00:00+02:00'),
    });
  });

  it('the 12 months and the 30 and 14 days ending today, oldest first', () => {
    expect(monthsEnding('2026-10', 12)).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ]);
    const thirty = daysEnding('2026-10-29', 30);
    expect(thirty).toHaveLength(30);
    expect([thirty[0], thirty[29]]).toEqual(['2026-09-30', '2026-10-29']);
    expect(daysEnding('2026-10-29', 14)[0]).toBe('2026-10-16');
  });

  it('the 28 days before today, today left out', () => {
    const days = fourWeeksBefore(NOW);
    expect(days).toHaveLength(28);
    expect([days[0], days[27]]).toEqual(['2026-10-01', '2026-10-28']);
  });

  it('hours labelled by Gaza weekday and hour across a daylight-saving night', () => {
    const plain = hourSlots(['2026-10-29']);
    expect(plain).toHaveLength(24);
    expect(plain[0]).toEqual({
      from: new Date('2026-10-29T00:00:00+02:00'),
      to: new Date('2026-10-29T01:00:00+02:00'),
      weekday: 4,
      hour: 0,
    });
    expect(plain.map(({ hour }) => hour)).toEqual([...Array(24).keys()]);

    // Saturday 2026-10-24: 02:00 (+03:00) is 01:00 (+02:00) again, so the hour 1 comes twice.
    const autumn = hourSlots(['2026-10-24']);
    expect(autumn).toHaveLength(25);
    expect(autumn.map(({ hour }) => hour)).toEqual([
      0,
      1,
      1,
      ...Array.from({ length: 22 }, (_, i) => i + 2),
    ]);
    expect(autumn.every(({ weekday }) => weekday === 6)).toBe(true);
    expect(autumn[24]?.to).toEqual(new Date('2026-10-25T00:00:00+02:00'));

    // Saturday 2026-03-28: 00:00 (+02:00) to 01:00, then 02:00 is 03:00 (+03:00): no hour 2.
    const spring = hourSlots(['2026-03-28']);
    expect(spring).toHaveLength(23);
    expect(spring.map(({ hour }) => hour)).not.toContain(2);
    // Two days follow each other.
    const both = hourSlots(['2026-10-28', '2026-10-29']);
    expect(both).toHaveLength(48);
    expect(both[24]).toMatchObject({ weekday: 4, hour: 0 });
  });
});
