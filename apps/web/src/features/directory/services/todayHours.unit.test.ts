import type { OpeningRange } from '@masaha/shared/spaces';
import { describe, expect, it } from 'vitest';
import { todayHours } from './todayHours';

const WORDS = {
  today: ({ range }: { range: string }) => `Today ${range}`,
  closedToday: 'Closed today',
  openAllDay: 'Open around the clock today',
};

const LRI = '⁦';
const PDI = '⁩';

// Sunday (0) to Saturday (6): open 08:00–22:00, Friday closed, Saturday around the clock.
const WEEK: (OpeningRange | null)[] = [
  { opensMinute: 480, closesMinute: 1320 },
  { opensMinute: 480, closesMinute: 1320 },
  { opensMinute: 480, closesMinute: 1320 },
  { opensMinute: 480, closesMinute: 1320 },
  { opensMinute: 510, closesMinute: 1440 },
  null,
  { opensMinute: 0, closesMinute: 1440 },
];

describe('todayHours', () => {
  it('reads today on Gaza’s calendar: an instant just past Gaza’s midnight is already its next day', () => {
    // 2026-10-21 is a Wednesday; 22:30 UTC is 01:30 on Thursday in Gaza (UTC+3).
    expect(todayHours(WEEK, new Date('2026-10-21T22:30:00Z'), WORDS)).toBe(
      `Today ${LRI}08:30–24:00${PDI}`,
    );
    expect(todayHours(WEEK, new Date('2026-10-21T12:00:00Z'), WORDS)).toBe(
      `Today ${LRI}08:00–22:00${PDI}`,
    );
  });

  it('says a closed day, and a day open around the clock', () => {
    expect(todayHours(WEEK, new Date('2026-10-23T12:00:00Z'), WORDS)).toBe('Closed today');
    expect(todayHours(WEEK, new Date('2026-10-24T12:00:00Z'), WORDS)).toBe(
      'Open around the clock today',
    );
  });

  it('draws nothing for hours never saved', () => {
    expect(todayHours(null, new Date('2026-10-21T12:00:00Z'), WORDS)).toBeNull();
  });
});
