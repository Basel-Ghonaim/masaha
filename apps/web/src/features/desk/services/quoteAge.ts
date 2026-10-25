// The server takes a quote's time at most 5 minutes old; the desk reads it again past 4.
const STALE_AFTER_MS = 4 * 60_000;

/** Whether a quote made at `at` is too old to send its time back at `now`. */
export function quoteIsStale(at: string, now: Date): boolean {
  return now.getTime() - new Date(at).getTime() > STALE_AFTER_MS;
}
