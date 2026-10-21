import type { ReactNode } from 'react';

/**
 * What the page sets in the directory's list: the links to the spaces, the areas' names, and the
 * place filter.
 */
export type DirectorySlots = {
  /** The address of a space's page. */
  spaceLink: (slug: string) => string;
  /** An area with its governorate, by its id. */
  areaName: (areaId: number) => ReactNode;
  /** The place filter: the areas chosen, and what changes them. */
  placeFilter: (value: number[], onChange: (ids: number[]) => void) => ReactNode;
};
