import type { AdminSpaceRow } from '@masaha/shared/space-links';
import type { BadgeProps } from '@shared/design-system';

/** A badge's words and its variant. */
export type BadgeView = { label: string; variant: NonNullable<BadgeProps['variant']> };

/** A space's name, marked with its language and direction when it is not the interface's. */
export type SpaceNameView = { text: string; lang?: 'en'; dir?: 'ltr' };

/** One row of the admin's spaces list, worded in the interface's language. */
export type AdminSpaceRowView = {
  id: number;
  /** The row as the server sent it, for the row's actions. */
  row: AdminSpaceRow;
  name: SpaceNameView;
  area: string;
  state: BadgeView;
  /** Its owners' names, each isolated, joined; `null` when it has none. */
  owners: string | null;
  /** A card's line of owners: shown with a dash when it has none, read aloud as having none. */
  ownersLine: { shown: string; heard: string };
  /** What is stale and what is missing, or that it is up to date. */
  freshness: BadgeView[];
  lastUpdated: string;
};
