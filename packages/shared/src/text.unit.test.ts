import { describe, expect, it } from 'vitest';

import { textSchema } from './text.ts';

const name = textSchema(1, 100);

describe('textSchema', () => {
  it('normalises to NFC and trims', () => {
    expect(name.parse('  Cafe\u0301 ')).toBe('Caf\u00e9');
    expect(name.parse('سارة')).toBe('سارة');
  });

  it.each([
    ['a line break', 'Sara\nYour account is locked'],
    ['a carriage return', 'Sara\rX'],
    ['a tab', 'Sara\tX'],
    ['a null', 'Sara\u0000'],
    ['a line separator', 'Sara\u2028Your account is locked'],
    ['a paragraph separator', 'Sara\u2029Your account is locked'],
    ['a bidirectional override', 'Sara\u202E'],
    ['an Arabic letter mark', 'Sara\u061C'],
  ])('refuses %s', (_case, text) => {
    const result = name.safeParse(text);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      code: 'custom',
      params: { code: 'invalid_format' },
    });
  });

  it('holds the length after trimming', () => {
    expect(name.safeParse('   ').success).toBe(false);
    expect(name.safeParse('x'.repeat(101)).success).toBe(false);
    expect(name.safeParse('x'.repeat(100)).success).toBe(true);
  });
});
