import { describe, expect, it } from 'vitest';
import { arabicPlural, englishPlural } from './plural';

// Each form names its own category, so a test reads which one a count takes.
const ARABIC_FORMS = {
  zero: 'zero',
  one: 'one',
  two: 'two',
  few: 'few',
  many: 'many',
  other: 'other',
} as const;

describe('arabicPlural', () => {
  it.each([
    [0, 'zero'],
    [1, 'one'],
    [2, 'two'],
    [3, 'few'],
    [10, 'few'],
    [103, 'few'],
    [11, 'many'],
    [99, 'many'],
    [111, 'many'],
    [100, 'other'],
    [101, 'other'],
    [102, 'other'],
  ])('gives %i its %s form', (count, form) => {
    expect(arabicPlural(count, ARABIC_FORMS)).toBe(form);
  });
});

describe('englishPlural', () => {
  it.each([
    [1, 'one'],
    [0, 'other'],
    [2, 'other'],
    [11, 'other'],
  ])('gives %i its %s form', (count, form) => {
    expect(englishPlural(count, { one: 'one', other: 'other' })).toBe(form);
  });
});
