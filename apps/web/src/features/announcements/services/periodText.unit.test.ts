import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { periodText } from './periodText';

const EN = CATALOGUES.en.announcements.period;
const AR = CATALOGUES.ar.announcements.period;
const NOW = new Date('2026-10-21T09:00:00.000Z');
/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (line: string) => line.replace(/[⁦-⁩]/g, '');

describe('periodText', () => {
  it('says one day with its two times, and two days each with its time', () => {
    // 08:00 to 18:00 in Gaza, on 1 October (summer time, UTC+3).
    expect(
      heard(
        periodText(
          { startsAt: '2026-10-01T05:00:00.000Z', endsAt: '2026-10-01T15:00:00.000Z' },
          'ar',
          NOW,
          AR,
        ),
      ),
    ).toBe('1 أكتوبر 08:00–18:00');
    expect(
      heard(
        periodText(
          { startsAt: '2026-10-01T05:00:00.000Z', endsAt: '2026-10-03T15:00:00.000Z' },
          'en',
          NOW,
          EN,
        ),
      ),
    ).toBe('1 October 08:00 – 3 October 18:00');
  });

  it('says a period with no end', () => {
    expect(
      heard(periodText({ startsAt: '2026-10-01T05:00:00.000Z', endsAt: null }, 'ar', NOW, AR)),
    ).toBe('من 1 أكتوبر 08:00 · بلا نهاية');
    expect(
      heard(periodText({ startsAt: '2026-10-01T05:00:00.000Z', endsAt: null }, 'en', NOW, EN)),
    ).toBe('From 1 October 08:00 · no end');
  });

  it('says the year of a day that is not this year’s', () => {
    expect(
      heard(
        periodText(
          { startsAt: '2026-12-31T08:00:00.000Z', endsAt: '2027-01-02T08:00:00.000Z' },
          'en',
          NOW,
          EN,
        ),
      ),
    ).toBe('31 December 10:00 – 2 January 2027 10:00');
  });

  it('reads 08:00 on Gaza’s clock in summer and in winter, whatever the browser’s zone', () => {
    // Gaza is UTC+3 in summer and UTC+2 in winter; the lane runs in New York.
    expect(
      heard(periodText({ startsAt: '2026-07-01T05:00:00.000Z', endsAt: null }, 'en', NOW, EN)),
    ).toBe('From 1 July 08:00 · no end');
    expect(
      heard(periodText({ startsAt: '2026-12-01T06:00:00.000Z', endsAt: null }, 'en', NOW, EN)),
    ).toBe('From 1 December 08:00 · no end');
    // Gaza's day, not the browser's: 00:30 in Gaza is the evening before in New York.
    expect(
      heard(periodText({ startsAt: '2026-12-01T22:30:00.000Z', endsAt: null }, 'en', NOW, EN)),
    ).toBe('From 2 December 00:30 · no end');
  });
});
