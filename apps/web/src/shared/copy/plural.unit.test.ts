import { describe, expect, it } from 'vitest';
import { ARABIC } from './arabic';
import { ENGLISH } from './english';
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

describe('the count of areas, the first counted line', () => {
  it.each([
    [0, 'لا مناطق'],
    [1, 'منطقة واحدة'],
    [2, 'منطقتان'],
    [3, '3 مناطق'],
    [10, '10 مناطق'],
    [11, '11 منطقة'],
    [99, '99 منطقة'],
    [100, '100 منطقة'],
    [102, '102 منطقة'],
  ])('reads %i in Arabic as «%s»', (count, line) => {
    expect(ARABIC.lookups.governorates.areaCount({ count })).toBe(line);
  });

  it.each([
    [1, '1 area'],
    [11, '11 areas'],
  ])('reads %i in English as "%s"', (count, line) => {
    expect(ENGLISH.lookups.governorates.areaCount({ count })).toBe(line);
  });
});
