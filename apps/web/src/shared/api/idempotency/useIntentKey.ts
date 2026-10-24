import { useCallback, useState } from 'react';

/**
 * One `Idempotency-Key` per intent (docs/frontend/architecture.md §7): a dialog opened for one item,
 * or one tap that writes without one. The key is made on first use and kept across renders, the
 * transport's re-sends, a second press, a retry after a lost answer and an edit of the form, until
 * `renew`, which the dialog calls when it opens again.
 */
export function useIntentKey(): { key: string; renew: () => void } {
  const [key, setKey] = useState(() => crypto.randomUUID());
  const renew = useCallback(() => {
    setKey(crypto.randomUUID());
  }, []);
  return { key, renew };
}
