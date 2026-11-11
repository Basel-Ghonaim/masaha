import type { SpaceNameView } from '@shared/lib';
import type { ReactNode, RefObject } from 'react';

/**
 * The space as its editor hands it to the owners' actions: its name in the interface's language,
 * whether it is verified, its owners (oldest first), and the notice, which takes the focus when the
 * control that opened a dialog is gone once it is done.
 */
export type OwnedSpace = {
  id: number;
  name: SpaceNameView;
  isVerified: boolean;
  owners: { id: number; name: string }[];
  focusFallback: RefObject<HTMLElement | null>;
};

/**
 * The owners' actions the page puts in the profile, from another capability: a verified space's notice,
 * an unverified one's header.
 */
export type OwnersSlot = (space: OwnedSpace) => ReactNode;
