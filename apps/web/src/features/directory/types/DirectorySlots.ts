import type { SpaceNameView } from '@shared/lib';
import type { ReactNode } from 'react';

/** A space as an action on its card or its page is handed it: whether the user saved it too. */
export type ActionSpace = { id: number; name: SpaceNameView; saved: boolean };

/**
 * What the page sets in the directory's list: the links to the spaces, the areas' names, the place
 * filter, and an action on each card.
 */
export type DirectorySlots = {
  /** The address of a space's page. */
  spaceLink: (slug: string) => string;
  /** An area with its governorate, by its id. */
  areaName: (areaId: number) => ReactNode;
  /** The place filter: the areas chosen, and what changes them. */
  placeFilter: (value: number[], onChange: (ids: number[]) => void) => ReactNode;
  /** An action on a space's card, beside its link: the favourite's heart. */
  cardAction?: (space: ActionSpace) => ReactNode;
};
