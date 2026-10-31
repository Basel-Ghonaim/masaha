import { describe, expect, it } from 'vitest';

import { PASSWORD_RULES, passwordRules, passwordSchema } from './passwordPolicy.ts';

describe('passwordSchema', () => {
  it('takes 8 characters with a letter and a digit, in any script', () => {
    expect(passwordSchema.safeParse('gaza2026').success).toBe(true);
    expect(passwordSchema.safeParse('غزة٢٠٢٦مساحة').success).toBe(true);
  });

  it.each([
    ['too short', 'gaza202'],
    ['without a digit', 'gazagaza'],
    ['without a letter', '20262026'],
  ])('refuses a password %s', (_case, password) => {
    expect(passwordSchema.safeParse(password).success).toBe(false);
  });

  it('counts the upper bound in bytes, as bcrypt does', () => {
    expect(passwordSchema.safeParse(`${'a'.repeat(71)}1`).success).toBe(true);
    expect(passwordSchema.safeParse(`${'ب'.repeat(35)}1`).success).toBe(true);

    const arabic = passwordSchema.safeParse(`${'ب'.repeat(36)}1`);

    expect(arabic.success).toBe(false);
    expect(arabic.error?.issues[0]).toMatchObject({ params: { code: 'too_long' } });
  });
});

describe('passwordRules', () => {
  it('meets no rule for an empty value', () => {
    expect(passwordRules('')).toEqual({
      minLength: false,
      letter: false,
      digit: false,
      bytes: true,
    });
  });

  it.each([
    ['a letter alone', 'g', { minLength: false, letter: true, digit: false, bytes: true }],
    ['a digit alone', '7', { minLength: false, letter: false, digit: true, bytes: true }],
    ['8 letters', 'gazagaza', { minLength: true, letter: true, digit: false, bytes: true }],
    ['8 digits', '20262026', { minLength: true, letter: false, digit: true, bytes: true }],
    [
      'an Arabic letter and an Arabic-Indic digit',
      'ب٢',
      { minLength: false, letter: true, digit: true, bytes: true },
    ],
  ])('reports which rules %s meets', (_case, password, rules) => {
    expect(passwordRules(password)).toEqual(rules);
  });

  it('breaks its fourth rule past 72 bytes in UTF-8, not 72 characters', () => {
    // 36 Arabic letters and a digit: 37 characters, 73 bytes.
    const arabic = `${'ب'.repeat(36)}1`;
    expect(passwordRules(arabic).bytes).toBe(false);
    expect(passwordRules(`${'ب'.repeat(35)}1`).bytes).toBe(true);
    expect(passwordRules(`${'a'.repeat(71)}1`).bytes).toBe(true);
    expect(passwordRules(`${'a'.repeat(72)}1`).bytes).toBe(false);
  });

  it.each([
    'gaza2026',
    'غزة٢٠٢٦مساحة',
    'gaza202',
    'gazagaza',
    '20262026',
    'g1',
    'مساحة٢٠٢٦',
    `${'ب'.repeat(36)}1`,
  ])('meets every rule exactly when the policy accepts %s', (password) => {
    const everyRule = Object.values(passwordRules(password)).every(Boolean);

    expect(everyRule).toBe(passwordSchema.safeParse(password).success);
  });

  it('lists the rules in the order of the checklist', () => {
    expect(PASSWORD_RULES.map(({ id }) => id)).toEqual(['minLength', 'letter', 'digit', 'bytes']);
  });

  it('shows the upper bound only while it is broken', () => {
    expect(PASSWORD_RULES.filter(({ onlyBroken }) => onlyBroken).map(({ id }) => id)).toEqual([
      'bytes',
    ]);
  });
});
