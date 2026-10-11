import { randomInt } from 'node:crypto';

import { passwordRules } from '@masaha/shared/users';

// Read aloud or typed from WhatsApp, so no character that looks like another: no 0 or O, o, 1, l
// or I. 56 characters, 12 of them: about 69 bits.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const LENGTH = 12;

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
