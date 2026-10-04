import type { PasswordRule } from '@masaha/shared/users';

/** The password checklist, worded and ready to render (`PasswordRules`). */
export type PasswordRulesView = {
  /** The list's accessible name. */
  label: string;
  rules: {
    rule: PasswordRule;
    text: string;
    /** `met`; `pending`, not met yet; or `failed`, not met by a password the form was sent with. */
    state: 'met' | 'pending' | 'failed';
    /** What assistive technology reads after the rule, which cannot see its mark. */
    status: string;
  }[];
};
