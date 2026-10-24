const MINUTE_MS = 60_000;

/** How long someone has stayed since `since` at `now`, in whole hours and minutes; never below 0. */
export function stayDuration(since: string, now: Date): { hours: number; minutes: number } {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(since).getTime()) / MINUTE_MS));
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}
