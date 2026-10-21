import type { ReactNode } from 'react';

/** What the page sets in the directory's list: the links to the spaces, and the areas' names. */
export type DirectorySlots = {
  /** The address of a space's page. */
  spaceLink: (slug: string) => string;
  /** An area with its governorate, by its id. */
  areaName: (areaId: number) => ReactNode;
};
