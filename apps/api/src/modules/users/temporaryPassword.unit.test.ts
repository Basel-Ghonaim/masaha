import { describe, expect, it } from 'vitest';

import { temporaryPassword } from './temporaryPassword.ts';

// Enough draws that one breaking the policy, a letter or a digit missing, would show.
const draws = Array.from({ length: 500 }, () => temporaryPassword());

describe('temporaryPassword', () => {
  it('is 12 characters, none of which looks like another (no 0, O, o, 1, l or I)', () => {
    for (const password of draws) {
      expect(password).toMatch(/^[A-HJ-NP-Za-km-np-z2-9]{12}$/);
    }
  });

  it('always meets the password policy: a letter and a digit', () => {
    for (const password of draws) {
      expect(password).toMatch(/[A-Za-z]/);
      expect(password).toMatch(/\d/);
    }
  });

  it('is a new password each time', () => {
    expect(new Set(draws).size).toBe(draws.length);
  });
});
