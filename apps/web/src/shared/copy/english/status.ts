/**
 * The states a route can end in instead of its page: not found, forbidden, the general error and
 * offline; the wait while the session is restored; and the region the app's toasts appear in.
 */
export const STATUS = {
  notFound: {
    title: 'Page not found',
    description: 'The link may have changed or the page was removed.',
  },
  forbidden: {
    title: 'You don’t have access to this page',
    description: 'This page isn’t available to your account.',
    /** The bare 403's line before its ways on («Home», «Contact us»), outside any shell. */
    mistake: 'If you think this is a mistake, contact us.',
  },
  error: {
    title: 'Something went wrong',
    description: 'The problem is on our side, not yours. Try again in a moment.',
  },
  offline: {
    title: 'No internet connection',
    description: 'The data will appear when you’re back online.',
  },
  retry: 'Try again',
  /** Said under the buttons when a retry finds the connection still gone. */
  stillOffline: 'Still no connection.',
  /** Said under the buttons when the general error comes back after a retry. */
  stillFailing: 'The error is still there. Try again in a little while.',
  loading: 'Loading',
  toasts: {
    /** Names the region the toasts are announced in. */
    label: 'Notifications',
    close: 'Close notification',
  },
} as const;
