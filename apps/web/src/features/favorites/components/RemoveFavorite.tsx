import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import { isolate } from '@shared/localisation';
import { useFavoriteToggle } from '../hooks/toggle/useFavoriteToggle';
import type { HeartSpace } from '../types/FavoriteSpace';

// The account's pages are signed-in only: a removal there never asks to sign in.
const NO_SIGN_IN = () => undefined;

/**
 * «إزالة» of a saved space that left the directory (C7): named «إزالة {name} من المفضّلة», sent once,
 * said with no «تراجع» — the API saves no space out of the directory (404), so an undo could never
 * work (DI-58, the owner's word); held until the favourites are read again, when its row leaves.
 */
export function RemoveFavorite({ space, manage }: { space: HeartSpace; manage: () => void }) {
  const words = useCopy().favorites;
  const heart = useFavoriteToggle({ space, saved: true, signIn: NO_SIGN_IN, manage, say: 'left' });

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={words.remove({ name: isolate(space.name.text) })}
      // Held, not disabled, while it is sent: the focus stays on it until its row leaves.
      aria-disabled={heart.busy || undefined}
      onClick={() => {
        if (!heart.busy) heart.run();
      }}
    >
      {words.list.remove}
    </Button>
  );
}
