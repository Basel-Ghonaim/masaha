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
    links: { reports: 'My reports' },
  },
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
