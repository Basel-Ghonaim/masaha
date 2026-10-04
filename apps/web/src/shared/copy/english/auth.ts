/** Signing in and registering: the forms, and what they say about a field. */
export const AUTH = {
  fields: {
    name: 'Name',
    email: 'Email',
    /** An example address, shown in the empty email field. */
    emailExample: 'name@example.com',
    password: 'Password',
  },
  /** The forms' own words for a field's error code, where they know the rule behind it. */
  fieldErrors: {
    name: {
      too_short: 'Enter your name',
    },
    email: {
      invalid_format: 'Check the email address, for example \u2066name@example.com\u2069',
    },
    /** At sign-in the password is only required: the policy applies to a new one. */
    currentPassword: {
      too_short: 'Enter your password',
    },
    newPassword: {
      too_short: 'The password doesn’t meet the rules below',
      invalid_format: 'The password doesn’t meet the rules below',
    },
  },
  signIn: {
    submit: 'Sign in',
    failed: 'Couldn’t sign in',
  },
  register: {
    submit: 'Create account',
    failed: 'Couldn’t create the account',
  },
} as const;
