import type { ActionSpace } from '@features/directory';
import { FavoriteButton, type FavoriteSignIn } from '@features/favorites';
import { useNavigate } from 'react-router';
import { SITE_PATHS } from '../navigation';

/**
 * The favourite's heart a page sets in the directory's slots: over a card's cover (`onCover`) or
 * beside a page's name; a full list's refusal leads to «المفضّلة».
 */
export function useHeart(signIn: FavoriteSignIn) {
  const navigate = useNavigate();
  const manage = () => {
    void navigate(SITE_PATHS.myFavorites);
  };

  return (space: ActionSpace, { onCover = false }: { onCover?: boolean } = {}) => (
    <FavoriteButton
      space={space}
      saved={space.saved}
      signIn={signIn}
      manage={manage}
      className={onCover ? 'bg-card shadow-floating' : undefined}
    />
  );
}
