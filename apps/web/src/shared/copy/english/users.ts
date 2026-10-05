/**
 * The signed-in user's account, wherever a shell shows it: the account menu and its sign-out, and
 * the forced change of a temporary password.
 */
export const USERS = {
  /** The account button's name, with the user's name. */
  menu: ({ name }: { name: string }) => `Account menu: ${name}`,
  /** The phone menu's account section. */
  section: 'Account',
  /** The way into the dashboard, for the admin and anyone who runs a space. */
  dashboard: 'Dashboard',
  signOut: 'Sign out',
  signOutFailed: 'Couldn’t sign out',
  /** The change of a temporary password, before any other page. */
  passwordChange: {
    title: 'Choose a new password',
    description:
      'This is a temporary password from the Masaha team. Choose your own password to continue.',
    newPassword: 'New password',
    submit: 'Save and continue',
    failed: 'Couldn’t save the password',
  },
} as const;
