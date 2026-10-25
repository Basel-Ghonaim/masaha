import { useSyncExternalStore } from 'react';

// How many pages show a bottom action bar now: at most one, but a page leaving and the next arriving
// may overlap for a render.
let shown = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/**
 * Says a page's bottom action bar is shown (docs/frontend/architecture.md §2), so the app's one
 * Toaster sits above it; the answer hides it again.
 */
export function showActionBar(): () => void {
  shown += 1;
  notify();
  return () => {
    shown -= 1;
    notify();
  };
}

/** Whether a page's bottom action bar is shown now: the Toaster reads it to sit above the bar. */
export function useActionBarShown(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => shown > 0,
  );
}
