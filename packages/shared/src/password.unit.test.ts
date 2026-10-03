import { describe, expect, it } from 'vitest';

import { passwordSchema } from './password.ts';

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
