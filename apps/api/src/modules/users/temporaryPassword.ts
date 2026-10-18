import { randomInt } from 'node:crypto';

import { passwordRules } from '@masaha/shared/users';

// Read aloud or typed from WhatsApp, so no character that looks like another: no 0 or O, o, 1, l
// or I. 56 characters, 12 of them: about 69 bits.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const LENGTH = 12;

/** A temporary password lives this long from its issue (A3, the owner's decision 2026-10-18). */
export const TEMPORARY_PASSWORD_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

/** When a temporary password issued at `issuedAt` expires. */
export function temporaryPasswordExpiry(issuedAt: Date): Date {
  return new Date(issuedAt.getTime() + TEMPORARY_PASSWORD_LIFETIME_MS);
}

/** Whether the account's temporary password is pending and has expired at `now` (at the instant: expired). */
export function temporaryPasswordExpired(
  account: { mustChangePassword: boolean; temporaryPasswordExpiresAt: Date | null },
  now: Date,
): boolean {
  const expiresAt = account.temporaryPasswordExpiresAt;
  return account.mustChangePassword && expiresAt !== null && expiresAt.getTime() <= now.getTime();
}

/**
 * A temporary password for an account created by someone else (docs/backend/security.md ›
 * Passwords): random from Node's `crypto`, and drawn again until it meets the password policy.
 */
export function temporaryPassword(): string {
  for (;;) {
    const password = Array.from(
      { length: LENGTH },
      () => ALPHABET[randomInt(ALPHABET.length)],
    ).join('');
    if (Object.values(passwordRules(password)).every(Boolean)) return password;
  }
}
