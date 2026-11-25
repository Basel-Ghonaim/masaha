import { englishPlural } from '../plural';

/** What every form says the same way: the password field, its rules, and a submission that failed. */
export const FORMS = {
  password: {
    show: 'Show password',
    hide: 'Hide password',
  },
  /** The line under a new password (A7): what it needs, what is still missing, or that it is fine. */
  passwordRules: {
    needs: 'At least 8 characters, with a letter and a number',
    /** Only what the password typed still lacks, each of `parts`, joined as the language joins. */
    missing: ({ parts }: { parts: readonly string[] }) =>
      `Still needs ${new Intl.ListFormat('en', { type: 'conjunction' }).format(parts)}`,
    parts: {
      characters: ({ count }: { count: number }) =>
        englishPlural(count, {
          one: '1 more character',
          other: `${String(count)} more characters`,
        }),
      letter: 'a letter',
      digit: 'a number',
    },
    fine: 'The password is fine',
    /** Shown only while broken: at most 72 bytes, which an Arabic letter takes two of. */
    tooLong: 'Too long — shorten it',
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
  /** Which records a page of a list shows, under the list: the range and the total come isolated. */
  listRange: ({ range, total }: { range: string; total: string }) => `Showing ${range} of ${total}`,
} as const;
