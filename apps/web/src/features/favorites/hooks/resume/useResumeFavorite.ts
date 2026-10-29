import { useSession } from '@shared/session';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { writeFavorite } from '../favoriteWrite';
import { takeFavorite } from '../intent/favoriteIntent';

/**
 * A guest's favourite, saved once they are back signed in (C4, DI-61): with a session and a favourite
 * held, it is saved once and said «حُفظت {name} في المفضّلة»; a failure is said with «إعادة
 * المحاولة». Nothing without one. `manage` leads to the favourites, from a full list's refusal.
 */
export function useResumeFavorite({ manage }: { manage: () => void }): void {
  const signedIn = useSession((state) => state.status === 'authenticated');
  const client = useQueryClient();

  useEffect(() => {
    if (!signedIn) return;
    const held = takeFavorite();
    if (held === null) return;
    void writeFavorite({
      save: true,
      space: { id: held.spaceId, name: held.name },
      say: 'returned',
      client,
      manage,
    });
  }, [signedIn, client, manage]);
}
