import type { Tx } from '../../db/index.ts';
import {
  createSpaceLinksRepository,
  type ActiveLink,
  type SpaceLinksRepository,
} from './space-links.repository.ts';

interface Dependencies {
  repository?: SpaceLinksRepository;
}

/**
 * The users' links to spaces and their role at each (ADR 0009). So far only what the session
 * needs: a user's active links.
 */
export function createSpaceLinksService({
  repository = createSpaceLinksRepository(),
}: Dependencies = {}) {
  return {
    /** Oldest first: with no space remembered, the dashboard opens the oldest (architecture.md §2). */
    activeLinksFor(userId: number, tx?: Tx): Promise<ActiveLink[]> {
      return repository.findActiveLinks(userId, tx);
    },
  };
}

export type SpaceLinksService = ReturnType<typeof createSpaceLinksService>;
