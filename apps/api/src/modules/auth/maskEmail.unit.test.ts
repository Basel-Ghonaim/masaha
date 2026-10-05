import { describe, expect, it } from 'vitest';

import { maskEmail } from './maskEmail.ts';

describe('maskEmail', () => {
  it('keeps the first character of the local part and the domain, and masks the rest', () => {
    expect(maskEmail('sara@example.com')).toBe('s•••@example.com');
  });

  it('masks a one-character local part to the same length as a long one', () => {
    expect(maskEmail('s@example.com')).toBe('s•••@example.com');
    expect(maskEmail('sara.ahmad.gaza@example.com')).toBe('s•••@example.com');
  });

  it('keeps a first character outside the Basic Multilingual Plane whole', () => {
    expect(maskEmail('😀x@example.com')).toBe('😀•••@example.com');
  });
});
