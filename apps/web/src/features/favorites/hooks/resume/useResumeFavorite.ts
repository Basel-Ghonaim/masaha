import { intentMayRun } from '@shared/routing';
import { useSession } from '@shared/session';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { writeFavorite } from '../favoriteWrite';
import { takeFavorite } from '../intent/favoriteIntent';

/**
 * A guest's favourite, saved once they are back signed in (C4, DI-61), on the page or over it (ADR
 * 0021): with a session that may run it (`intentMayRun`: no temporary password still to change)
 * and a favourite held, it is saved once and said «حُفظت {name} في المفضّلة»; a failure is said with
 * «إعادة المحاولة». Nothing without one. `manage` leads to the favourites, from a full list's refusal.
 */
export function useResumeFavorite({ manage }: { manage: () => void }): void {
  const mayRun = useSession(intentMayRun);
  const client = useQueryClient();

  useEffect(() => {
    if (!mayRun) return;
    const held = takeFavorite();
    if (held === null) return;
    void writeFavorite({
      save: true,
      space: { id: held.spaceId, name: held.name },
      say: 'returned',
      client,
      manage,
    });
  }, [mayRun, client, manage]);
}
