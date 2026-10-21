import { describe, expect, it } from 'vitest';
import { distanceText } from './distanceText';

describe('distanceText', () => {
  it('says kilometres: one decimal under 10, whole from 10, never «.0», in Western digits', () => {
    expect(distanceText(700, 'ar')).toBe('0.7');
    expect(distanceText(1000, 'ar')).toBe('1');
    expect(distanceText(9_900, 'en')).toBe('9.9');
    expect(distanceText(12_300, 'ar')).toBe('12');
    expect(distanceText(0, 'en')).toBe('0');
  });
});
