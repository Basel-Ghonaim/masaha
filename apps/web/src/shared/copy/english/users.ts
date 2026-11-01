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
  /** The site's account menu: its links to the account's pages (P4). */
  account: {
    links: { favorites: 'Favourites', reports: 'My reports', settings: 'Account settings' },
  },
  /** The role beside the name in the dashboard's account menu: the role at the space, or the admin. */
  roles: { OWNER: 'Owner', RECEPTION: 'Reception', ADMIN: 'Admin' },
  /** «إعدادات حسابي» (screen 9): its title, which its route and the page's heading show. */
  settings: {
    title: 'Account settings',
    loadFailed: 'Couldn’t load your account',
    profile: {
      title: 'Profile',
      name: 'Name',
      email: 'Email',
      emailNote: 'You sign in with this email',
      save: 'Save',
      failed: 'Couldn’t save the changes',
      saved: 'Changes saved',
    },
    preferences: {
      title: 'Preferences',
      description: 'Applied right away.',
      language: 'Language',
      languageHelper: 'Saved to your account',
      languageFailed: 'Couldn’t save the language',
      theme: 'Theme',
      themeHelper: 'On this device',
      themes: { light: 'Light', dark: 'Dark', system: 'Device setting' },
    },
    signIn: {
      title: 'Signing in',
      description: 'The ways you sign in to your account.',
      google: 'Google',
      googleLine: ({ email }: { email: string }) => `You sign in with Google · ${email}`,
      linked: 'Linked',
      password: 'Password',
      passwordLine: 'You sign in with your email and password',
      change: 'Change',
      notSet: 'Not set yet',
      setLine: 'To also sign in with your email and a password, we send a link to your email',
    },
    passwordForm: {
      current: 'Current password',
      new: 'New password',
      othersLine: 'Changing your password signs you out on all your other devices',
      save: 'Save password',
      back: 'Back',
      failed: 'Couldn’t save the password',
      saved: 'Password changed, and you were signed out on your other devices',
    },
  },
  /** The dashboard's account menu: the way back to the public site. */
  publicSite: 'Public site',
  /** The account menu's label with a role: the name, then the role. */
  nameWithRole: ({ name, role }: { name: string; role: string }) => `${name} · ${role}`,
  signOut: 'Sign out',
  signOutFailed: 'Couldn’t sign out',
  /** The change of a temporary password, before any other page. */
  passwordChange: {
    title: 'Choose a new password',
    description: 'This is a temporary password. Choose your own password to continue.',
    newPassword: 'New password',
    submit: 'Save and continue',
    failed: 'Couldn’t save the password',
    /** The toast once the new password is saved. */
    saved: 'Your new password is saved',
  },
  /** The one-time password shown once, and how it was handed over. */
  temporaryPassword: {
    title: 'Temporary password',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'We couldn’t copy it — select it and copy it by hand.',
    line: 'Hand it over; they’ll be asked to change it at their first sign-in.',
    /** An issued password's line, in place of a new account's. */
    issuedLine:
      'Hand it over once you’ve confirmed who they are; they’ll be asked to change it at their next sign-in.',
    channel: 'How it was handed over',
    channels: {
      WHATSAPP: 'WhatsApp',
      IN_PERSON: 'In person',
      OTHER: 'Other',
    },
    chooseChannel: 'Choose how it was handed over',
    copyFirst: 'Copy it first — it won’t be shown again',
    done: 'Done',
    recorded: ({ name, channel }: { name: string; channel: string }) =>
      `Handover recorded: ${name} · ${channel}`,
    failed: 'We couldn’t record the handover',
    notRecorded: 'The handover wasn’t recorded',
  },
  /** A person's account items on the admin's users page. */
  accountActions: {
    suspend: 'Suspend',
    restore: 'Restore the account',
    restored: ({ name }: { name: string }) => `${name}’s account restored`,
    restoreFailed: ({ name }: { name: string }) => `We couldn’t restore ${name}’s account`,
    issue: 'Issue a temporary password',
    googleOnly: 'A Google account — they recover it through Google',
    suspendedFirst: 'The account is suspended — restore it first',
  },
  /** Suspending an account, after the admin confirms. */
  suspend: {
    title: ({ name }: { name: string }) => `Suspend ${name}?`,
    line: 'All their sessions end at once, and they can’t sign in until you restore the account.',
    ownerLine: 'Their spaces stay verified; the Masaha team edits them only once they’re unlinked.',
    deskLine: 'Their front-desk link is kept; they can’t work the desk until restored.',
    confirm: 'Suspend',
    cancel: 'Back',
    failed: 'The account wasn’t suspended',
    refusals: { not_found: 'This account no longer exists.' },
    suspended: ({ name }: { name: string }) => `${name} suspended; their sessions ended`,
  },
  /** Issuing a temporary password, after the admin confirms. */
  issuePassword: {
    title: ({ name }: { name: string }) => `Issue a temporary password for ${name}?`,
    line: 'To recover the account once you’ve confirmed who they are. Their current password stops working and their sessions end; they must change it at the next sign-in.',
    confirm: 'Issue',
    cancel: 'Back',
    failed: 'No password was issued',
    refusals: {
      ACCOUNT_SUSPENDED: 'The account is suspended — restore it first.',
      not_found: 'This account no longer exists.',
    },
  },
} as const;
