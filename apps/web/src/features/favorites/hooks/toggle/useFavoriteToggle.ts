import { useCopy } from '@shared/copy';
import { isolate } from '@shared/localisation';
import { useSession } from '@shared/session';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { FavoriteSignIn, HeartSpace } from '../../types/FavoriteSpace';
import { writeFavorite, type FavoriteWriteSay } from '../favoriteWrite';
import { dropFavorite, holdFavorite } from '../intent/favoriteIntent';

/**
 * A heart (PU-014, U12), ready to render: for a signed-in user, pressed at once (the optimistic
 * state, architecture §7) and held while its write is pending, then the directory's favourites, read
 * again, are the truth (S13); the save or the removal sent once, said with «تراجع», or, failed, put
 * back and said with «إعادة المحاولة» (DI-49). A guest's press holds the favourite in memory and asks
 * the page to show its sign-in (S14, C4). While the session is still being restored, a press waits.
 * `saved` is the directory's; `manage` leads to the favourites, from a full list's refusal.
 */
export function useFavoriteToggle({
  space,
  saved,
  signIn,
  manage,
  say = 'undoable',
}: {
  space: HeartSpace;
  saved: boolean;
  signIn: FavoriteSignIn;
  manage: () => void;
  /** How the write is said: with «تراجع», or, for a space that left the directory, without. */
  say?: Extract<FavoriteWriteSay, 'undoable' | 'left'>;
}) {
  const words = useCopy().favorites;
  const client = useQueryClient();
  const session = useSession((state) => state.status);
  // The state pressed while a write is pending; none once the favourites read after it have arrived.
  const [held, setHeld] = useState<boolean | null>(null);
  // The latest press: an earlier press's write, settling late, leaves a later one's state alone.
  const latest = useRef(0);
  const pressed = held ?? saved;
  const name = isolate(space.name.text);

  return {
    pressed,
    // One name, whatever its state: `aria-pressed` says whether it is saved (WAI-ARIA's toggle
    // button; #129's review).
    label: words.save({ name }),
    busy: held !== null,
    run: () => {
      if (session !== 'authenticated') {
        if (session === 'restoring') return;
        holdFavorite({ spaceId: space.id, name: space.name });
        signIn('favorite', dropFavorite);
        return;
      }
      const save = !pressed;
      latest.current += 1;
      const press = latest.current;
      setHeld(save);
      void writeFavorite({
        save,
        space,
        say,
        client,
        manage,
        settled: () => {
          if (latest.current === press) setHeld(null);
        },
      });
    },
  };
}
