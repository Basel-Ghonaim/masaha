import type { DirectorySpace, MapPin } from '@masaha/shared/directory';
import type { HoursStatus, LiveStatus } from '@masaha/shared/occupancy';
import type { Catalogue } from '@shared/copy';
import type { PRICE_PERIODS } from '@masaha/shared/spaces';
import { isolated } from '@shared/forms';
import { priceText, spaceNameOf } from '@shared/lib';
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
 * A space's state as its card shows it: a verified space's live status by word and role; an
 * unverified one's state by its hours, always neutral, never the live status's colours; or none.
 */
function cardStatusOf(
  space: { isVerified: boolean; liveStatus: LiveStatus | null; hoursStatus: HoursStatus | null },
  copy: Catalogue,
): SpaceCardView['status'] {
  if (space.isVerified) return statusViewOf(space.liveStatus, copy);
  if (space.hoursStatus === null) return null;
  return { label: copy.directory.status.byHours[space.hoursStatus], variant: 'neutral' };
}

/**
 * A space's card, worded in the interface's language: its name, its mark, its state (`cardStatusOf`),
 * whether it is verified, its evening and its women's hall while it has them (a pin has neither),
 * today's hours (or that they are not available), and how far it is while
 * the list is ordered by distance (`byDistance`): an answer asked by distance and still shown once
 * the order stops says no distance. While the list is filtered by a subscription (`period`), the
 * price its answer carries, «15 ₪ / يوم», the amount left to right. A map's pin makes the same
 * card, its area by its id, with no price.
 */
export function cardViewOf(
  space: DirectorySpace | MapPin,
  {
    english,
    now,
    copy,
    byDistance,
    period,
  }: {
    english: boolean;
    now: Date;
    copy: Catalogue;
    byDistance: boolean;
    period?: (typeof PRICE_PERIODS)[number] | undefined;
  },
): SpaceCardView {
  const amount = 'priceAgorot' in space ? space.priceAgorot : undefined;
  const words = copy.directory;
  const name = spaceNameOf(space, english);
  return {
    key: space.id,
    slug: space.slug,
    name,
    mark: Array.from(name.text)[0] ?? '',
    areaId: 'areaId' in space ? space.areaId : space.area.id,
    cover: space.cover,
    status: cardStatusOf(space, copy),
    noStatus: words.status.none,
    verified: space.isVerified ? words.card.verified : null,
    evening: 'worksEvenings' in space && space.worksEvenings ? words.card.evening : null,
    womensHall: 'womensHall' in space && space.womensHall ? words.card.womensHall : null,
    today: todayHours(space.days, now, words.card),
    distance:
      !byDistance || !('distanceMeters' in space) || space.distanceMeters === undefined
        ? null
        : words.card.distance({
            km: isolated(distanceText(space.distanceMeters, english ? 'en' : 'ar')),
          }),
    price:
      period === undefined || amount === undefined
        ? null
        : words.card.price({
            price: isolated(priceText(amount, english ? 'en' : 'ar')),
            period: words.card.periods[period],
          }),
  };
}
