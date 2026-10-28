import { toAppError } from '@shared/errors';
import type { SpaceNameView } from '@shared/lib';
import type { QueryClient } from '@tanstack/react-query';
import {
  toastFavoriteChanged,
  toastFavoriteFailed,
  toastRemovedLeft,
  toastSavedOnReturn,
} from '../components/toast/favoriteToasts';
import { createFavoritesRepository } from '../repository/favoritesRepository';

const repository = createFavoritesRepository();

/**
 * How a write is said once it is done: with «تراجع», as a guest's return, as the removal of a space
 * that left the directory (no «تراجع»: it cannot be saved meanwhile), or not at all (an undo).
 */
export type FavoriteWriteSay = 'undoable' | 'returned' | 'left' | 'quiet';

/**
 * Saves or removes a favourite, once: no key, never re-sent by itself (S4). Done, it is said and the
 * user's whole scope is read again, whose favourites are the directory's (S13); the promise of that
 * read is `settled`'s. Failed, it is said with a retry (a space gone reads the scope again too).
 * Outside any component, so an undo from a toast still runs once the heart has left the page.
 */
export async function writeFavorite({
  save,
  space,
  say,
  client,
  manage,
  settled,
}: {
  save: boolean;
  space: { id: number; name: SpaceNameView };
  say: FavoriteWriteSay;
  client: QueryClient;
  manage: () => void;
  /** Called once the write has failed, or once the read after it has ended. */
  settled?: () => void;
}): Promise<void> {
  const again = (nextSave: boolean, nextSay: FavoriteWriteSay) => {
    void writeFavorite({ save: nextSave, space, say: nextSay, client, manage });
  };
  try {
    await (save ? repository.save(space.id) : repository.remove(space.id));
  } catch (caught) {
    const error = toAppError(caught);
    settled?.();
    if (error.status === 404) void client.invalidateQueries({ queryKey: ['me'] });
    toastFavoriteFailed({
      save,
      name: space.name,
      error,
      retry: () => {
        again(save, say);
      },
      manage,
    });
    return;
  }
  if (say === 'undoable') {
    toastFavoriteChanged(save, space.name, () => {
      again(!save, 'quiet');
    });
  } else if (say === 'returned') {
    toastSavedOnReturn(space.name);
  } else if (say === 'left') {
    toastRemovedLeft(space.name);
  }
  // A read of the scope still on its way began before this write (on a guest's return, the hearts'
  // first): an invalidation joins a first read rather than restarting it, so it is cancelled first
  // and the read starts again after the write.
  void client
    .cancelQueries({ queryKey: ['me'] })
    .then(() => client.invalidateQueries({ queryKey: ['me'] }))
    .finally(() => settled?.());
}
