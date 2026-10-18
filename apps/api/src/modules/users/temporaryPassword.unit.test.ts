import { describe, expect, it } from 'vitest';

import {
  temporaryPassword,
  temporaryPasswordExpired,
  temporaryPasswordExpiry,
} from './temporaryPassword.ts';

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

describe('the expiry of a temporary password', () => {
  it('expires a temporary password exactly 7 days after its issue', () => {
    expect(temporaryPasswordExpiry(new Date('2026-10-18T10:00:00.000Z'))).toEqual(
      new Date('2026-10-25T10:00:00.000Z'),
    );
  });

  it('counts a pending temporary password as expired from its expiry’s instant, and never one not pending', () => {
    const expiresAt = new Date('2026-10-25T10:00:00.000Z');
    const pending = { mustChangePassword: true, temporaryPasswordExpiresAt: expiresAt };
    const at = (ms: number) => new Date(expiresAt.getTime() + ms);

    expect(temporaryPasswordExpired(pending, at(-1))).toBe(false);
    expect(temporaryPasswordExpired(pending, at(0))).toBe(true);
    expect(temporaryPasswordExpired(pending, at(60_000))).toBe(true);
    expect(
      temporaryPasswordExpired(
        { mustChangePassword: false, temporaryPasswordExpiresAt: expiresAt },
        at(60_000),
      ),
    ).toBe(false);
  });
});
