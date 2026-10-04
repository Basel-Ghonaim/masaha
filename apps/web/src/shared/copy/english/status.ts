/**
 * The states a route can end in instead of its page: not found, forbidden, the general error and
 * offline; and the wait while the session is restored.
 */
export const STATUS = {
  notFound: {
    title: 'Page not found',
    description: 'The link may have changed or the page was removed.',
  },
  forbidden: {
    title: 'You don’t have access to this page',
    description: 'This page isn’t available to your account.',
  },
  error: {
    title: 'Something went wrong',
    description: 'It wasn’t your fault. Try again in a moment.',
  },
  offline: {
    title: 'No internet connection',
    description: 'The data will appear when you’re back online.',
  },
  retry: 'Try again',
  loading: 'Loading',
} as const;
