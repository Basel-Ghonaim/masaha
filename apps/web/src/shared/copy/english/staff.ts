import { englishPlural } from '../plural';

/** The owner's staff page: the space's reception accounts. */
export const STAFF = {
  /** What a receptionist reaches, under the page's title. */
  intro:
    'A receptionist reaches the desk, the customers, the announcements and their own payments today — never the finance or the settings.',
  label: 'Staff',
  count: ({ count }: { count: number }) =>
    englishPlural(count, { one: '1 staff member', other: `${String(count)} staff members` }),
  columns: { name: 'Name', status: 'Status', actions: 'Actions' },
  badges: {
    active: 'Active',
    inactive: 'No access',
    pending: 'Hasn’t changed the temporary password yet',
    expired: 'The temporary password has expired',
  },
  loadFailed: 'We couldn’t load the staff',
  empty: {
    title: 'No staff yet',
    text: 'You can run the desk yourself, or add a receptionist.',
  },
  add: {
    open: 'Add staff member',
    title: 'Add staff member',
    description: 'Role: Reception',
    name: 'Name',
    email: 'Email',
    /** Said before the submit: what adding one does. */
    notice:
      'A new account is created for this email, with a temporary password shown to you once — have a way to hand it over ready. An existing account is never linked.',
    submit: 'Create the reception account',
    failed: 'Couldn’t add the staff member',
    close: 'Close',
    fieldErrors: {
      name: {
        required: 'Enter the name',
        too_short: 'Enter the name',
        too_long: 'The name is too long',
      },
      email: {
        required: 'Enter the email',
        invalid_format: 'Enter a valid email, e.g. name@example.com',
        not_unique:
          'This email already has a Masaha account, and an existing account is never linked. Use another email; if they are on your staff list, act from their row: give their access back, or issue them a new temporary password.',
      },
    },
    /** The add's refusals, in the owner's words: the space's route, whose 404 is the space's. */
    refusals: {
      forbidden: 'This is no longer open to you at this space; no one was added.',
      not_found: 'This space is no longer available to you.',
    },
  },
} as const;
