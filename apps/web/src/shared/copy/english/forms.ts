import type { PasswordRule } from '@masaha/shared/users';

/** What every form says the same way: the password field, its rules, and a submission that failed. */
export const FORMS = {
  password: {
    show: 'Show password',
    hide: 'Hide password',
  },
  /** The checklist under a new password, ticked as the user types. */
  passwordRules: {
    label: 'Password rules',
    rules: {
      minLength: 'At least 8 characters',
      letter: 'At least one letter',
      digit: 'At least one number',
    } satisfies Record<PasswordRule, string>,
    /** Read after a rule by assistive technology, which cannot see its tick. */
    met: '— met',
    notMet: '— not met yet',
  },
  /** A submission the server refused, or could not be sent. */
  failure: {
    /** The wait comes as a clock, minutes and seconds: `14:32`. */
    retryIn: ({ wait }: { wait: string }) => `Too many attempts. Try again in ${wait}.`,
    offlineTitle: 'Couldn’t connect',
    offlineDescription: 'Check your internet connection and try again.',
    /** The server's id for the request, so a report can be matched to the log. */
    reference: ({ id }: { id: string }) => `Reference: ${id}`,
  },
} as const;
