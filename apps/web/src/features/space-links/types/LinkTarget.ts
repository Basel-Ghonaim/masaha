import type { SpaceNameView } from './AdminSpaceRowView';

/**
 * Where a link begins: a space, from its editor, which links an owner only while it has none; or a
 * person, from their row on the owners or the users page — a user or an owner — with the spaces
 * theirs and the spaces whose front desk they work.
 */
export type LinkTarget =
  | { from: 'space'; space: { id: number; name: SpaceNameView }; addOwnerLink: string }
  | {
      from: 'person';
      person: {
        id: number;
        name: string;
        role: 'USER' | 'OWNER';
        spaceIds: readonly number[];
        deskIds: readonly number[];
      };
    };
