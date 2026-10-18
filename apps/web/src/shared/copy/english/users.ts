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
} as const;
