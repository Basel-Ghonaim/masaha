/** The states a route can end in instead of its page: not found, the general error and offline. */
export const STATUS = {
  notFound: {
    title: 'Page not found',
    description: 'The link may have changed or the page was removed.',
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
} as const;
