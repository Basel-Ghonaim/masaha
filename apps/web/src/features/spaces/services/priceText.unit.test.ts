import { describe, expect, it } from 'vitest';
import { priceText } from './priceText';

// Arabic-Indic digits, which a price never shows.
const ARABIC_INDIC = /[٠-٩]/;

describe('priceText', () => {
  it('writes an amount in shekels with Western digits in both languages', () => {
    expect(priceText(1500, 'en')).toBe('₪15');
    expect(priceText(1250, 'en')).toBe('₪12.50');
    expect(priceText(10_000_000, 'en')).toBe('₪100,000');
    // The Arabic string's spacing and marks are the engine's: its digits and its sign are checked.
    for (const [agorot, digits] of [
      [1500, '15'],
      [1250, '12.50'],
    ] as const) {
      const arabic = priceText(agorot, 'ar');
      expect(arabic).toContain(digits);
      expect(arabic).toContain('₪');
      expect(arabic).not.toMatch(ARABIC_INDIC);
    }
  });
});
