/** The password's condition as one line, worded and ready to render (`PasswordRules`). */
export type PasswordRulesView = {
  /**
   * `needs`: nothing typed yet, what it needs; `missing`: only what it still lacks; `met`: it meets
   * the policy; `failed`: sent without meeting it, or past its upper bound.
   */
  state: 'needs' | 'missing' | 'met' | 'failed';
  line: string;
};
