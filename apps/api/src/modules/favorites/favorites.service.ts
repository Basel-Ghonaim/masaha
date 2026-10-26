import { FAVORITES_MAX } from '@masaha/shared/favorites';

import type { RunInTransaction } from '../../db/index.ts';
import type { Actor } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { LookupsService } from '../lookups/index.ts';
import type { PublicListingService } from '../spaces/index.ts';
import type { UsersService } from '../users/index.ts';
import { createFavoritesRepository, type SavedSpace } from './favorites.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  users: UsersService;
  publicListing: PublicListingService;
  lookups: LookupsService;
  /** The one clock (conventions §11): a favourite is dated by it. */
  now: () => Date;
}

/**
 * A user's saved spaces (docs/backend/conventions.md §7): saved while publicly listed, at most
 * `FAVORITES_MAX`, and removed whatever their space became. Their cards are the directory's (§9).
 * A person's own choice: nothing is audited.
 */
export function createFavoritesService({
  runInTransaction,
  users,
  publicListing,
  lookups,
  now,
}: Dependencies) {
  const repository = createFavoritesRepository();

  /** Whether the space is publicly listed now, as the directory lists it (S12). */
  async function isListed(spaceId: number): Promise<boolean> {
    const { rows } = await publicListing.upTo(
      { areaIds: await lookups.listedAreaIds(), verifiedIds: [], onlyIds: [spaceId] },
      1,
    );
    return rows.length > 0;
  }

  return {
    /**
     * Saves the space. Whether it is listed is read first, before the transaction (its reads are
     * not the transaction's, conventions §8); then, in one transaction and in this order: the
     * user's row locked (the session lock), so one user's saves are serialised and the ceiling
     * holds; a space already saved is answered as it is, writing nothing, even at the ceiling; a
     * space not listed is `not_found`; the ceiling `FAVORITES_LIMIT_REACHED`; else the favourite.
     */
    async save(actor: Actor, spaceId: number): Promise<void> {
      const listed = await isListed(spaceId);
      await runInTransaction(async (tx) => {
        if (!(await users.lockAccount(actor.id, tx))) throw AppError.unauthorized();
        if (await repository.has(actor.id, spaceId, tx)) return;
        if (!listed) throw AppError.notFound(undefined, 'Space not found');
        if ((await repository.countOf(actor.id, tx)) >= FAVORITES_MAX) {
          throw AppError.conflict('FAVORITES_LIMIT_REACHED', 'Favourites full');
        }
        await repository.create({ userId: actor.id, spaceId, createdAt: now() }, tx);
      });
    },

    /** Removes the space from the user's favourites, listed or not; idempotent by design. */
    remove(actor: Actor, spaceId: number): Promise<void> {
      return repository.remove(actor.id, spaceId);
    },

    /** The user's saved spaces, the newest saved first: the directory composes their cards. */
    of(userId: number): Promise<SavedSpace[]> {
      return repository.of(userId);
    },
  };
}

export type FavoritesService = ReturnType<typeof createFavoritesService>;
