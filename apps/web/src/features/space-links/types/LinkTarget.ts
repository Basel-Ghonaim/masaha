import type { SpaceNameView } from './AdminSpaceRowView';

/**
 * Where a link begins: a space, from its editor, which links an owner only while it has none; or a
 * person, from their row on the owners page, who is an owner already, with the spaces theirs.
 */
export type LinkTarget =
  | { from: 'space'; space: { id: number; name: SpaceNameView }; addOwnerLink: string }
  | { from: 'person'; person: { id: number; name: string; spaceIds: readonly number[] } };
