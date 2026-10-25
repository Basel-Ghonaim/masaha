import type { ManagedSpace } from '@masaha/shared/space-links';

import type { Tx } from '../../db/index.ts';
import type { SpaceManagerRole } from '../../generated/prisma/enums.ts';
import type { SpaceLink } from '../../shared/auth/index.ts';
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
    /**
     * The session's links, oldest first: with no space remembered, the dashboard opens the oldest
     * (architecture.md §2). A link to a soft-deleted space counts for nothing, so it is left out;
     * the link itself is kept, so restoring the space restores it (finding 18).
     */
    async activeLinksFor(userId: number, tx?: Tx): Promise<ActiveLink[]> {
      const links = await repository.findActiveLinks(userId, tx);
      if (links.length === 0) return [];
      const summaries = await spaces.summariesFor(
        links.map(({ spaceId }) => spaceId),
        tx,
      );
      const live = new Set(summaries.map(({ id }) => id));
      return links.filter(({ spaceId }) => live.has(spaceId));
    },

    /**
     * The roles of the user's active links, each once: whether reception's idle end binds them
     * (docs/backend/security.md › Tokens and cookies). One query.
     */
    activeRolesOf(userId: number, tx?: Tx): Promise<SpaceManagerRole[]> {
      return repository.activeRolesOf(userId, tx);
    },

    /**
     * The links loader of the space routes (conventions §8, Space access): every link to the space,
     * from which `can()` reads the caller's role there and whether the space is verified. A
     * soft-deleted space has none: its links count for nothing (finding 18). With `tx`, under the
     * space's lock, it reads them as every link change leaves them (finding 43).
     */
    async linksAt(spaceId: number, tx?: Tx): Promise<SpaceLink[]> {
      // One query at a time inside a transaction: its connection runs one statement at once.
      const links = await repository.findLinksAt(spaceId, tx);
      const summaries = await spaces.summariesFor([spaceId], tx);
      return summaries.length === 0 ? [] : links;
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

    /**
     * Every verified space's id, those with an active OWNER link (data-model › Derived values), in
     * one query: the public directory's filter and the stale prices it hides, resolved to ids before
     * `spaces` pages (conventions §5). A soft-deleted space's id may be among them; the directory
     * never lists one.
     */
    verifiedSpaceIds(tx?: Tx): Promise<number[]> {
      return repository.findVerifiedSpaceIds(tx);
    },
  };
}

export type SpaceLinksService = ReturnType<typeof createSpaceLinksService>;
