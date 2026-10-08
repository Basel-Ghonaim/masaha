/** The actions on a space's row: hiding or showing it, deleting it, and the undo's restore. */
export type SpaceActionKind = 'hidden' | 'delete' | 'restore';

/** The prefix of every action on a space. */
export const SPACE_ACTIONS = ['admin', 'spaces', 'action'] as const;

/** An action's key: the prefix, then its kind. */
export function spaceActionKey(kind: SpaceActionKind) {
  return [...SPACE_ACTIONS, kind] as const;
}
