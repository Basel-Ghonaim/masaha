import { describe, expect, it } from 'vitest';

import { emailSchema, registerSchema } from './auth.ts';

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

describe('registerSchema', () => {
  it('takes an optional interface language, ar or en', () => {
    const base = { name: 'Sara', email: 'sara@example.com', password: 'gaza2026' };

    expect(registerSchema.parse(base).language).toBeUndefined();
    expect(registerSchema.parse({ ...base, language: 'en' }).language).toBe('en');
    expect(registerSchema.safeParse({ ...base, language: 'fr' }).success).toBe(false);
  });
});
