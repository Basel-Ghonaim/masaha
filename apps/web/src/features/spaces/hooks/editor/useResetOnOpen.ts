import { useEffect, useRef } from 'react';

/**
 * Fills a Sheet's form again each time it opens (`reset`), from the space as it is then, so a Sheet
 * compares with what it opened on and never with an earlier opening's draft.
 */
export function useResetOnOpen(open: boolean, reset: () => void): void {
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reset();
    wasOpen.current = open;
  }, [open, reset]);
}
