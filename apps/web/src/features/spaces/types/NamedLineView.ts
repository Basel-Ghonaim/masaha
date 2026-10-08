import type { SpaceNameView } from './SpaceNameView';

/** A line that names a space, cut around the name so the name keeps its own language. */
export type NamedLineView = { before: string; name: SpaceNameView; after: string };
