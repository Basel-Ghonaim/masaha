import type { SpaceNameView } from './SpaceNameView';

/** An action on one space: which, and its name as the interface showed it, for its toasts. */
export type SpaceAction = { spaceId: number; name: SpaceNameView };
