import { z } from 'zod';

// The password policy (docs/backend/security.md › Passwords). The upper bound is bcrypt's: it
// ignores every byte after the 72nd, so it is counted in UTF-8 bytes, not characters: an Arabic
// letter takes two.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

// A letter and a digit in any script.
const LETTER = /\p{L}/u;
const DIGIT = /\p{N}/u;

/** 8 characters to 72 bytes, with at least one letter and one digit. */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .max(PASSWORD_MAX_LENGTH)
  .refine((password) => new TextEncoder().encode(password).length <= PASSWORD_MAX_LENGTH, {
    params: { code: 'too_long' },
  })
  .regex(LETTER)
  .regex(DIGIT);

/** The rules a new password is shown against, in the order a checklist lists them. */
export const PASSWORD_RULES = ['minLength', 'letter', 'digit'] as const;
export type PasswordRule = (typeof PASSWORD_RULES)[number];

/**
 * Which of the policy's rules a value meets, by the policy's own measures, so a checklist ticks
 * exactly what the schema accepts. The upper bound is not a rule to meet: it is reported as a field
 * error.
 */
export function passwordRules(password: string): Record<PasswordRule, boolean> {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    letter: LETTER.test(password),
    digit: DIGIT.test(password),
  };
}
