import { describe, expect, it } from 'vitest';

import { registerSchema } from './requests.ts';

describe('registerSchema', () => {
  it('takes an optional interface language, ar or en', () => {
    const base = { name: 'Sara', email: 'sara@example.com', password: 'gaza2026' };

    expect(registerSchema.parse(base).language).toBeUndefined();
    expect(registerSchema.parse({ ...base, language: 'en' }).language).toBe('en');
    expect(registerSchema.safeParse({ ...base, language: 'fr' }).success).toBe(false);
  });
});
