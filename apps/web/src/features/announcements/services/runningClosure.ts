import type { PublicAnnouncement } from '../types/PublicAnnouncement';

/**
 * The closure running at `now` among a space's public announcements: the first `CLOSURE` that has
 * started and has no end, or ends after `now`; none otherwise. The page shows it at its top (DI-59).
 */
export function runningClosure(
  items: readonly PublicAnnouncement[],
  now: Date,
): PublicAnnouncement | null {
  const at = now.getTime();
  return (
    items.find(
      ({ type, startsAt, endsAt }) =>
        type === 'CLOSURE' &&
        Date.parse(startsAt) <= at &&
        (endsAt === null || Date.parse(endsAt) > at),
    ) ?? null
  );
}
