import type { SpaceNameView } from '@shared/lib';
import type { ReactNode } from 'react';

/** What the admin's list hands the page's space filter: its words, the space chosen, the choice. */
export type AdminSpaceFilterProps = {
  label: string;
  /** The space chosen, by id; none for every space. */
  value: number | undefined;
  /** The chosen space's name, from the reports shown while filtered by it. */
  chosenName: SpaceNameView | null;
  /** Said for a chosen space whose name is not known yet. */
  chosenFallback: string;
  onChange: (spaceId: number | undefined) => void;
};

/** The space filter the page sets in the admin's list: `space-links`' one-space search. */
export type AdminSpaceFilterSlot = (props: AdminSpaceFilterProps) => ReactNode;
