import type { AdminUserRow } from '@masaha/shared/space-links';
import type { SpaceNameView } from './AdminSpaceRowView';

/** One row of the admin's users list, worded in the interface's language. */
export type UserRowView = {
  id: number;
  /** The row as the server sent it, for the row's actions. */
  row: AdminUserRow;
  name: string;
  email: string;
  /** Whether the account may sign in: active on a success badge, suspended on a neutral one. */
  state: { label: string; variant: 'success' | 'neutral' };
  /** The spaces of its active owner links, each named in the interface's language. */
  spaces: SpaceNameView[];
  /** The spaces of its active reception links, each named in the interface's language. */
  receptionSpaces: SpaceNameView[];
  /** An owner whose every space is deleted: the list leaves a deleted space out (finding 50). */
  allSpacesDeleted: boolean;
};
