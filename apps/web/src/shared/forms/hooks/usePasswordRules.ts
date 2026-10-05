import { PASSWORD_RULES, passwordRules } from '@masaha/shared/users';
import { useCopy } from '@shared/copy';
import type { PasswordRulesView } from '../types/PasswordRulesView';

/**
 * The password policy as a checklist that ticks as the user types (docs/backend/security.md ›
 * Passwords). Which rules are met comes from the policy itself (`passwordRules`), so the list ticks
 * exactly what the server accepts. Once the form was sent with the password failing (`invalid`), a
 * rule not met shows as failed.
 */
export function usePasswordRules(value: string, invalid: boolean): PasswordRulesView {
  const copy = useCopy();
  const lines = copy.forms.passwordRules;
  const met = passwordRules(value);

  return {
    label: lines.label,
    rules: PASSWORD_RULES.map((rule) => ({
      rule,
      text: lines.rules[rule],
      state: met[rule] ? 'met' : invalid ? 'failed' : 'pending',
      status: met[rule] ? lines.met : lines.notMet,
    })),
  };
}
