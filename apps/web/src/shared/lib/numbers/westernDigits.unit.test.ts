import { describe, expect, it } from 'vitest';
import { toWesternDigits } from './westernDigits';

describe('toWesternDigits', () => {
  it('reads both Arabic-Indic sets as Western digits', () => {
    expect(toWesternDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    expect(toWesternDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
  });

  it('leaves everything else as it is', () => {
    expect(toWesternDigits(' ١٢:٣٠ م، 45.5 ')).toBe(' 12:30 م، 45.5 ');
  });
});
