import type { SheetEntry } from '@features/desk';
import { useCallback, useState } from 'react';

/**
 * The page's one subscription sheet, opened from any of its entries: what the entry knew, and the
 * opening's count, so each opening mounts a new sheet with new keys (S4).
 */
export function useSheetOpener() {
  const [entry, setEntry] = useState<SheetEntry | null>(null);
  const [opening, setOpening] = useState(0);
  const open = useCallback((next: SheetEntry) => {
    setEntry(next);
    setOpening((count) => count + 1);
  }, []);
  const close = useCallback(() => {
    setEntry(null);
  }, []);
  return { entry, opening, open, close };
}
