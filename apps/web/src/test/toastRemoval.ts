import { vi } from 'vitest';

// The toast library removes a toast it closes (dismissed, or timed out) after a timer of its own,
// 200 ms, which unmounting the toaster does not clear, and that timer sets React state. Fired once the
// file's jsdom is gone, it fails the run with `window is not defined` (finding 219). So a file that
// drew a toast waits that timer out once, after its last test, while its environment still stands.
const TOAST_REMOVAL_MS = 200;

/** Waits the toast library's removal timer out on the real clock, so no timer outlives the jsdom. */
export async function waitOutToastRemoval(): Promise<void> {
  // A file may leave fake timers on; the wait needs the real clock.
  vi.useRealTimers();
  await new Promise<void>((resolve) => {
    setTimeout(resolve, TOAST_REMOVAL_MS + 100);
  });
}
