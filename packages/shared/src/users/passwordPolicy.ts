import { z } from 'zod';

// The password policy (docs/backend/security.md › Passwords). The upper bound is bcrypt's: it
// ignores every byte after the 72nd, so it is counted in UTF-8 bytes, not characters: an Arabic
// letter takes two.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

// A letter and a digit in any script.
const LETTER = /\p{L}/u;
const DIGIT = /\p{N}/u;

/** Whether a password stays within the upper bound, counted in UTF-8 bytes. */
function withinBytes(password: string): boolean {
  return new TextEncoder().encode(password).length <= PASSWORD_MAX_LENGTH;
}

/** 8 characters to 72 bytes, with at least one letter and one digit. */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .max(PASSWORD_MAX_LENGTH)
  .refine(withinBytes, {
    params: { code: 'too_long' },
  })
  .regex(LETTER)
  .regex(DIGIT);

/**
 * The rules a new password is shown against, in the order a checklist lists them. The upper bound
 * (`bytes`, at most 72 bytes in UTF-8) is not a rule to work towards: a checklist shows it only while
 * it is broken (`onlyBroken`).
 */
export const PASSWORD_RULES = [
  { id: 'minLength', onlyBroken: false },
  { id: 'letter', onlyBroken: false },
  { id: 'digit', onlyBroken: false },
  { id: 'bytes', onlyBroken: true },
] as const;
export type PasswordRule = (typeof PASSWORD_RULES)[number]['id'];

/**
 * Which of the policy's rules a value meets, by the policy's own measures, so a checklist ticks
 * exactly what the schema accepts.
 */
export function passwordRules(password: string): Record<PasswordRule, boolean> {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    letter: LETTER.test(password),
    digit: DIGIT.test(password),
    bytes: withinBytes(password),
  };
}
