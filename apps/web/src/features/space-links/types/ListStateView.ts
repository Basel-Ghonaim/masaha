/** What a paged list shows in place of its rows when there are none: why, and what can be done. */
export type ListStateView = {
  status: 'loading' | 'error' | 'ready' | 'noMatch' | 'empty';
  failure: {
    title: string;
    message?: string | undefined;
    reference?: string | undefined;
    retryLabel: string;
    blocked: boolean;
    retry: () => void;
  };
  noMatch: { title: string; clearLabel: string; clear: () => void };
  empty: { title: string; description: string };
};
