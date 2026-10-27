import { describe, expect, it } from 'vitest';
import { dayText } from './dayText';

describe('dayText', () => {
  it('says a Gaza date as its day and its month, in Western digits in both languages', () => {
    expect(dayText('2026-10-21', 'en')).toBe('21 October');
    expect(dayText('2026-10-21', 'ar')).toBe('21 أكتوبر');
  });

  it('keeps the date’s own day, whatever the browser’s zone', () => {
    expect(dayText('2026-01-01', 'en')).toBe('1 January');
  });
});
