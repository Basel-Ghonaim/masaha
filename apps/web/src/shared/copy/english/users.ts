/** The signed-in user's account, wherever a shell shows it: the account menu and its sign-out. */
export const USERS = {
  /** The account button's name, with the user's name. */
  menu: ({ name }: { name: string }) => `Account menu: ${name}`,
  /** The phone menu's account section. */
  section: 'Account',
  signOut: 'Sign out',
  signOutFailed: 'Couldn’t sign out',
} as const;
