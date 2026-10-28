import { AreaName } from '@features/lookups';
import { FavoritesView } from '@features/directory';
import { RemoveFavorite } from '@features/favorites';
import { useCopy } from '@shared/copy';
import { publicSpacePath } from '@shared/routing';
import { useNavigate } from 'react-router';
import { SITE_PATHS } from '../navigation';
import { useHeart } from '../public/useHeart';
import { useSignInPrompt } from '../public/useSignInPrompt';

// The lookups' area name set in the cards' slot, made once so it is the same between renders.
const areaName = (areaId: number) => <AreaName areaId={areaId} source="public" />;

/**
 * «المفضّلة» (screen 10): its heading and what it lists, then the user's favourites — each listed
 * space the directory's card with favorites' heart, each space that left with «إزالة» — near me's
 * «اختر منطقتك» leading to the directory, and «حدّد موقعي على الخريطة» to its map, as Home's.
 */
export function FavoritesPage() {
  const words = useCopy().favorites.list;
  const navigate = useNavigate();
  const { signIn, prompt } = useSignInPrompt();
  const heart = useHeart(signIn);
  const manage = () => {
    void navigate(SITE_PATHS.myFavorites);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-1">{words.title}</h1>
        <p className="text-body text-muted-foreground">{words.description}</p>
      </div>
      <FavoritesView
        spaceLink={publicSpacePath}
        areaName={areaName}
        cardAction={(space) => heart(space, { onCover: true })}
        unlistedAction={(space) => <RemoveFavorite space={space} manage={manage} />}
        browseLink={SITE_PATHS.spaces}
        chooseArea={() => {
          void navigate(SITE_PATHS.spaces);
        }}
        openMap={() => {
          void navigate(`${SITE_PATHS.spaces}?view=map`);
        }}
      />
      {prompt}
    </>
  );
}
