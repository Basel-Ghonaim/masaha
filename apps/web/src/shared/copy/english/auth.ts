/** Signing in and registering: the pages, their forms, and what the forms say about a field. */
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
    title: 'Sign in',
    description:
      'Sign in to follow your favourite spaces and the reports you’ve sent about wrong information.',
    submit: 'Sign in',
    failed: 'Couldn’t sign in',
    forgotPassword: 'Forgot password?',
    noAccount: 'No account?',
    createAccount: 'Create account',
    browseWithoutAccount: 'Browse spaces without an account',
  },
  register: {
    title: 'Create account',
    description: 'Save your favourite spaces and follow the reports you send.',
    submit: 'Create account',
    failed: 'Couldn’t create the account',
    haveAccount: 'Have an account?',
    signIn: 'Sign in',
    /** Under the email field when the address already has an account. */
    signInInstead: 'Sign in with this email',
    ownerNote: 'Run a coworking space? Space owner accounts are created by the Masaha team.',
  },
} as const;
