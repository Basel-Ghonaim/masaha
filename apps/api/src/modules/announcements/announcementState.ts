import type { AnnouncementState } from '@masaha/shared/announcements';

/**
 * An announcement's state at `now`, from its instants (docs/architecture/data-model.md › Derived
 * values): `UPCOMING` before its start, `ENDED` from its end, else `RUNNING` (with no end, until it is
 * ended). The comparisons of `closedAt`, so a running closure is what closes the live status.
 */
export function announcementState(
  { startsAt, endsAt }: { startsAt: Date; endsAt: Date | null },
  now: Date,
): AnnouncementState {
  if (startsAt > now) return 'UPCOMING';
  if (endsAt !== null && endsAt <= now) return 'ENDED';
  return 'RUNNING';
}
