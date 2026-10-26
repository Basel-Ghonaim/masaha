import type { OpenSheet, SheetEntry } from '@features/desk';
import { useCallback, useRef, useState } from 'react';

/**
 * The page's one subscription sheet, opened from any of its entries: what the entry knew, the
 * opening's count, so each opening mounts a new sheet with new keys (S4), and the control the focus
 * returns to once it closes.
 */
export function useSheetOpener() {
  const [entry, setEntry] = useState<SheetEntry | null>(null);
  const [opening, setOpening] = useState(0);
  const from = useRef<HTMLElement | null>(null);
  const open: OpenSheet = useCallback((next, trigger) => {
    from.current = trigger;
    setEntry(next);
    setOpening((count) => count + 1);
  }, []);
  const returnFocus = useCallback(() => from.current, []);
  const close = useCallback(() => {
    setEntry(null);
  }, []);
  return { entry, opening, open, close, returnFocus };
}
