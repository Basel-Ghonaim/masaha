/**
 * Signing in, registering and recovering a password: the pages, their forms, and what the forms say
 * about a field.
 */
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
  /** The forgotten password: asking for a reset link, and the link sent. */
  forgotPassword: {
    title: 'Forgot password',
    description:
      'Enter the email you signed up with, and we’ll send it a link to set a new password.',
    submit: 'Send reset link',
    failed: 'Couldn’t send the link',
    sentTitle: 'Check your email',
    sentMessage:
      'If this email is registered with us, you’ll get a message with a link to set a new password. The link is valid for one hour. Check your spam folder.',
    /** The masked email the link was asked for. */
    sentTo: ({ email }: { email: string }) => `Sent to ${email}`,
    resend: 'Resend',
    /** The wait before another link may be asked for, as a clock. */
    resendIn: ({ wait }: { wait: string }) => `Resend in ${wait}`,
    resendFailed: 'Couldn’t resend the link',
    /** Once no other link may be asked for, or to ask for a new one instead of an open link. */
    enterEmailAgain: 'Enter your email again',
    /** A link was checked in this browser; the email is the account's, masked. */
    linkOpenTitle: 'You’ve opened a reset link',
    linkOpenDescription: ({ email }: { email: string }) =>
      `For ${email}. Set your new password, or ask for a new link.`,
    continue: 'Set a new password',
    noEmailAccess: 'Can’t access your email?',
    contactUs: 'Contact us',
    backToSignIn: 'Back to sign in',
  },
  /** The reset link: the new password, the link no longer valid, and the password set. */
  resetPassword: {
    title: 'Set a new password',
    /** The account's masked email, under the title. */
    forAccount: ({ email }: { email: string }) => `For ${email}`,
    newPassword: 'New password',
    submit: 'Save password',
    failed: 'Couldn’t save the password',
    /** The link's check was answered without a verdict on the link, such as too many attempts. */
    checkFailedTitle: 'Couldn’t check the link',
    reopenLink: 'Open the link in your email again.',
    invalidTitle: 'The link has expired or was already used',
    invalidDescription: 'Reset links are valid for one hour and can be used once.',
    requestNewLink: 'Request a new link',
    doneTitle: 'Your password was changed, and you were signed out on all devices',
    doneDescription: 'Sign in with your new password.',
    signIn: 'Sign in',
  },
} as const;
