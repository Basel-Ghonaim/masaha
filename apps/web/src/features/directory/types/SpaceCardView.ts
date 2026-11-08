import type { SpaceNameView } from '@shared/lib';

/** A space's card, ready to render; its area is named by the page's slot. */
export type SpaceCardView = {
  key: number;
  slug: string;
  name: SpaceNameView;
  /** The shown name's first character, drawn when there is no cover. */
  mark: string;
  areaId: number;
  cover: string | null;
  /**
   * A verified space's live status by its word and its role, or an unverified one's state by its
   * hours, always neutral; none → `noStatus`.
   */
  status: { label: string; variant: 'success' | 'warning' | 'neutral' } | null;
  noStatus: string;
  verified: string | null;
  /** Today's hours, or that the hours are not available. */
  today: string;
  /** How far, in a straight line, while the list is ordered by distance. */
  distance: string | null;
};
