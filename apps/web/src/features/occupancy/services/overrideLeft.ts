const MINUTE_MS = 60_000;

/**
 * What is left of an override ending at `until`, at `now`, as `h:mm`: a part of a minute counts as a
 * whole one, so it never reads `0:00` while it is in force.
 */
export function overrideLeft(until: string, now: Date): string {
  const minutes = Math.max(0, Math.ceil((new Date(until).getTime() - now.getTime()) / MINUTE_MS));
  return `${String(Math.floor(minutes / 60))}:${String(minutes % 60).padStart(2, '0')}`;
}
