import {
  createSpaceEditorRepository,
  type SpaceEditorRepository,
} from '../../repository/spaceEditorRepository';
import type { EditorPlace } from '../../types/EditorPlace';

/**
 * What differs by place for the editor's data: where its calls go, the keys it keeps the space, its
 * photos and its writes under, the scope a write marks out of date, and the scope that holds the
 * lookups' lists its fields read. The admin's sit under the admin's scope; an owner's under the
 * space's, as every capability's at one space (docs/frontend/architecture.md §7).
 */
export type EditorScope = {
  repository: SpaceEditorRepository;
  /** One space, whole, as the editor edits it. */
  spaceKey: (spaceId: number) => readonly unknown[];
  /** One space's photos, in the gallery's order; photos are no fact group, so a key of their own. */
  photosKey: (spaceId: number) => readonly unknown[];
  /** Every write on one space's facts, its saves and its confirmations, while the editor shows it. */
  writeKey: (spaceId: number) => readonly unknown[];
  /**
   * The views a write's answer leaves out of date: the admin's lists, or the signed-in user's own
   * spaces, whose switcher names the space.
   */
  answered: readonly unknown[];
  /** The scope of the lookups' lists the editor's fields read, fetched again when one is retired. */
  lists: readonly unknown[];
};

/** Each place's scope, made once. */
export const EDITOR_SCOPES: Record<EditorPlace, EditorScope> = {
  admin: {
    repository: createSpaceEditorRepository('admin'),
    spaceKey: (spaceId) => ['admin', 'spaces', 'space', spaceId] as const,
    photosKey: (spaceId) => ['admin', 'spaces', 'photos', spaceId] as const,
    writeKey: (spaceId) => ['admin', 'spaces', 'write', spaceId] as const,
    answered: ['admin'] as const,
    lists: ['admin'] as const,
  },
  owner: {
    repository: createSpaceEditorRepository('owner'),
    spaceKey: (spaceId) => ['space', spaceId, 'spaces', 'space'] as const,
    photosKey: (spaceId) => ['space', spaceId, 'spaces', 'photos'] as const,
    writeKey: (spaceId) => ['space', spaceId, 'spaces', 'write'] as const,
    answered: ['me'] as const,
    lists: ['public'] as const,
  },
};
