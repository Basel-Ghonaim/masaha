/** An admin's settings card before its values are read: its head, and its skeleton or its failure. */
export type CardLoadView = {
  /** The card's anchor. */
  id: string;
  title: string;
  description: string;
  state: 'loading' | 'failed';
  failure: {
    title: string;
    message: string | undefined;
    retryLabel: string;
    blocked: boolean;
    retry: () => void;
  };
};
