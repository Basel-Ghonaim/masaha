import type { ManagedSpace } from '@masaha/shared/space-links';

import type { Tx } from '../../db/index.ts';
import { createLookupsService, type LookupsService } from '../lookups/index.ts';
import { createSpacesService, type SpacesService } from '../spaces/index.ts';
import { toManagedSpace } from './space-links.mapper.ts';
import {
  createSpaceLinksRepository,
  type ActiveLink,
  type SpaceLinksRepository,
} from './space-links.repository.ts';

interface Dependencies {
  repository?: SpaceLinksRepository;
  spaces?: SpacesService;
  lookups?: LookupsService;
}

/**
 * The users' links to spaces and their role at each (ADR 0009). So far: a user's active links, for
 * the session, and the spaces behind them, for the user's own list.
 */
export function createSpaceLinksService({
  repository = createSpaceLinksRepository(),
  spaces = createSpacesService(),
  lookups = createLookupsService(),
}: Dependencies = {}) {
  return {
    /** Oldest first: with no space remembered, the dashboard opens the oldest (architecture.md §2). */
    activeLinksFor(userId: number, tx?: Tx): Promise<ActiveLink[]> {
      return repository.findActiveLinks(userId, tx);
    },

    /**
     * The spaces the user holds an active link to, with their role at each, oldest link first. A
     * hidden space is included, since its owner still manages it; a soft-deleted one is left out.
     * One query per module, whatever the number of links (conventions §9, Composed reads).
     */
    async mySpaces(userId: number): Promise<ManagedSpace[]> {
      const links = await repository.findActiveLinks(userId);
      if (links.length === 0) return [];
      const summaries = await spaces.summariesFor(links.map(({ spaceId }) => spaceId));
      const areas = await lookups.areaNamesFor([...new Set(summaries.map(({ areaId }) => areaId))]);

      const spaceById = new Map(summaries.map((space) => [space.id, space]));
      const areaById = new Map(areas.map((area) => [area.id, area]));
      return links.flatMap((link) => {
        const space = spaceById.get(link.spaceId);
        // No summary: the space is soft-deleted. Its area always exists (a foreign key).
        const area = space && areaById.get(space.areaId);
        return space && area ? [toManagedSpace(link, space, area)] : [];
      });
    },
  };
}

export type SpaceLinksService = ReturnType<typeof createSpaceLinksService>;
