import { describe, expect, it } from 'vitest';

import { emailSchema, paragraphSchema, textSchema } from './fields.ts';

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

describe('paragraphSchema', () => {
  const description = paragraphSchema(1, 20);

  it('keeps line breaks, as line feeds, and trims the whole', () => {
    expect(description.parse(' Quiet\nDesks ')).toBe('Quiet\nDesks');
    expect(description.parse('Quiet\r\nDesks')).toBe('Quiet\nDesks');
    expect(description.parse('Cafe\u0301')).toBe('Caf\u00e9');
  });

  it.each([
    ['a lone carriage return', 'Quiet\rDesks'],
    ['a tab', 'Quiet\tDesks'],
    ['a null', 'Quiet\u0000'],
    ['a line separator', 'Quiet\u2028Desks'],
    ['a paragraph separator', 'Quiet\u2029Desks'],
    ['a bidirectional override', 'Quiet\u202E'],
  ])('refuses %s', (_case, text) => {
    expect(description.safeParse(text).error?.issues[0]).toMatchObject({
      code: 'custom',
      params: { code: 'invalid_format' },
    });
  });

  it('holds the length after normalising the breaks', () => {
    expect(description.safeParse(`${'x'.repeat(9)}\r\n${'x'.repeat(10)}`).success).toBe(true);
    expect(description.safeParse('x'.repeat(21)).success).toBe(false);
    expect(description.safeParse(' \n ').success).toBe(false);
  });
});

describe('emailSchema', () => {
  it('trims and lowercases, so one address is one account', () => {
    expect(emailSchema.parse('  Sara@Example.COM ')).toBe('sara@example.com');
  });

  it.each([
    ['no @', 'sara.example.com'],
    ['no domain', 'sara@'],
    ['over 254 characters', `${'s'.repeat(64)}@${'d'.repeat(186)}.com`],
  ])('refuses an address with %s', (_case, email) => {
    expect(emailSchema.safeParse(email).success).toBe(false);
  });
});
