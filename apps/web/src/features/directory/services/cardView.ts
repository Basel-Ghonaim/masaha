import type { DirectorySpace, MapPin } from '@masaha/shared/directory';
import type { LiveStatus } from '@masaha/shared/occupancy';
import type { Catalogue } from '@shared/copy';
import { isolated } from '@shared/forms';
import { spaceNameOf } from '@shared/lib';
import type { SpaceCardView } from '../types/SpaceCardView';
import { distanceText } from './distanceText';
import { todayHours } from './todayHours';

/** Each live state's word and role (DECISIONS_SHARED, 2026-10-10): full is a warning, closed neutral. */
const STATUS_VIEWS = {
  AVAILABLE: { word: 'available', variant: 'success' },
  FULL: { word: 'full', variant: 'warning' },
  CLOSED: { word: 'closedNow', variant: 'neutral' },
} as const satisfies Record<
  LiveStatus,
  { word: keyof Catalogue['terms']['liveStatuses']; variant: string }
>;

/** A live status by its word and its role, or none (`null`), as the card and the legend show it. */
export function statusViewOf(
  liveStatus: LiveStatus | null,
  copy: Catalogue,
): SpaceCardView['status'] {
  if (liveStatus === null) return null;
  const status = STATUS_VIEWS[liveStatus];
  return { label: copy.terms.liveStatuses[status.word], variant: status.variant };
}

/**
 * A space's card, worded in the interface's language: its name, its mark, its live status by word
 * and role (or that it has none), whether it is verified, today's hours, and how far it is while
 * the list is ordered by distance (`byDistance`): an answer asked by distance and still shown once
 * the order stops says no distance. A map's pin makes the same card, its area by its id. No price.
 */
export function cardViewOf(
  space: DirectorySpace | MapPin,
  {
    english,
    now,
    copy,
    byDistance,
  }: { english: boolean; now: Date; copy: Catalogue; byDistance: boolean },
): SpaceCardView {
  const words = copy.directory;
  const name = spaceNameOf(space, english);
  return {
    key: space.id,
    slug: space.slug,
    name,
    mark: Array.from(name.text)[0] ?? '',
    areaId: 'areaId' in space ? space.areaId : space.area.id,
    cover: space.cover,
    status: statusViewOf(space.liveStatus, copy),
    noStatus: words.status.none,
    verified: space.isVerified ? words.card.verified : null,
    today: todayHours(space.days, now, words.card),
    distance:
      !byDistance || !('distanceMeters' in space) || space.distanceMeters === undefined
        ? null
        : words.card.distance({
            km: isolated(distanceText(space.distanceMeters, english ? 'en' : 'ar')),
          }),
  };
}
