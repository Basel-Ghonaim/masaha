import type { ReactNode, RefObject } from 'react';
import type { SpaceNameView } from './SpaceNameView';

/**
 * The space as its editor hands it to the owners' actions: its name in the interface's language,
 * whether it is verified, its owners (oldest first), whether the editor has unsaved changes, which a
 * link would drop by turning it read-only, and the notice, which takes the focus when the control that
 * opened a dialog is gone once it is done.
 */
export type OwnedSpace = {
  id: number;
  name: SpaceNameView;
  isVerified: boolean;
  owners: { id: number; name: string }[];
  unsaved: boolean;
  focusFallback: RefObject<HTMLElement | null>;
};

/** The owners' actions the page puts in the editor's notice, from another capability. */
export type OwnersSlot = (space: OwnedSpace) => ReactNode;
