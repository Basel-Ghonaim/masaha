import { describe, expect, it } from 'vitest';
import { periodText } from './periodText';

const WORDS = { today: 'Today' };
/** The text with each of its spaces read as a plain one: `formatRange` sets thin ones around «–». */
const spaced = (text: string) => text.replace(/\s/g, ' ');
const TODAY = '2026-10-21';

describe('periodText', () => {
  it('says «Today» with no range, or with today’s alone', () => {
    expect(periodText({}, 'en', TODAY, WORDS)).toBe('Today');
    expect(periodText({ from: TODAY, to: TODAY }, 'en', TODAY, WORDS)).toBe('Today');
  });

  it('says one day with its year', () => {
    expect(periodText({ from: '2026-10-20', to: '2026-10-20' }, 'en', TODAY, WORDS)).toBe(
      '20 October 2026',
    );
    expect(periodText({ from: '2026-10-20', to: '2026-10-20' }, 'ar', TODAY, WORDS)).toBe(
      '20 أكتوبر 2026',
    );
  });

  it('says a range in a month, across months and across years', () => {
    expect(periodText({ from: '2026-10-01', to: '2026-10-21' }, 'ar', TODAY, WORDS)).toBe(
      '1–21 أكتوبر 2026',
    );
    expect(spaced(periodText({ from: '2026-09-25', to: '2026-10-21' }, 'en', TODAY, WORDS))).toBe(
      '25 September – 21 October 2026',
    );
    expect(spaced(periodText({ from: '2025-12-25', to: '2026-01-03' }, 'ar', TODAY, WORDS))).toBe(
      '25 ديسمبر 2025 – 3 يناير 2026',
    );
  });

  it('keeps each date’s own day, whatever the browser’s zone', () => {
    // The first of a month read in a zone west of UTC would be the last of the one before.
    expect(periodText({ from: '2026-01-01', to: '2026-01-01' }, 'en', TODAY, WORDS)).toBe(
      '1 January 2026',
    );
  });
});
