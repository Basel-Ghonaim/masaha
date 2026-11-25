import { PASSWORD_MIN_LENGTH, passwordRules } from '@masaha/shared/users';
import { useCopy } from '@shared/copy';
import type { PasswordRulesView } from '../types/PasswordRulesView';

/**
 * The password policy as one line under the field (A7; docs/backend/security.md › Passwords): before
 * typing, what it needs («8 أحرف على الأقل، فيها حرف ورقم»); while typing, only what is still
 * missing; once met, that it is fine. Which rules are met comes from the policy itself
 * (`passwordRules`), so the line says exactly what the server accepts. Once the form was sent with the
 * password failing (`invalid`), what is missing shows as failed. Past the upper bound, only «طويلة
 * جدًا — اختصرها», as failed (AC-020).
 */
export function usePasswordRules(value: string, invalid: boolean): PasswordRulesView {
  const lines = useCopy().forms.passwordRules;
  const met = passwordRules(value);

  if (!met.bytes) return { state: 'failed', line: lines.tooLong };
  if (met.minLength && met.letter && met.digit) return { state: 'met', line: lines.fine };
  if (value === '') return { state: invalid ? 'failed' : 'needs', line: lines.needs };

  const parts: string[] = [];
  if (!met.minLength) {
    parts.push(lines.parts.characters({ count: PASSWORD_MIN_LENGTH - value.length }));
  }
  if (!met.letter) parts.push(lines.parts.letter);
  if (!met.digit) parts.push(lines.parts.digit);
  return { state: invalid ? 'failed' : 'missing', line: lines.missing({ parts }) };
}
