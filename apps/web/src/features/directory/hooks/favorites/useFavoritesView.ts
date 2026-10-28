import type { FavoriteSpace } from '@masaha/shared/directory';
import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { spaceNameOf, type SpaceNameView } from '@shared/lib';
import { useLanguage } from '@shared/localisation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createDirectoryRepository } from '../../repository/directoryRepository';
import { cardViewOf } from '../../services/cardView';
import type { FavoritesRequest } from '../../types/FavoritesRequest';
import type { ListFailureView } from '../../types/DirectoryListView';
import type { LocationStatusView } from '../../types/LocationStatusView';
import type { SpaceCardView } from '../../types/SpaceCardView';
import { useFailureView } from '../list/useFailureView';
import { useLocationStatus } from '../near/useLocationStatus';
import { useNearMe } from '../near/useNearMe';
import { directoryKeys } from '../queryKeys';

const repository = createDirectoryRepository();

/** A space that left the directory, kept in the user's favourites (C7): its name and its line. */
export type UnlistedFavoriteView = { key: string; id: number; name: SpaceNameView; line: string };

/**
 * «المفضّلة» (screen 10), ready to render: how many spaces are saved; the listed ones as the
 * directory's cards, newest saved first, or, while near me sorts by distance from a point, nearest
 * first, the point in its header only (AC-014); then the spaces that left the directory, by their
 * names (C7, C8). Near me is the Directory's: one store, one button, one state line; «اختر منطقتك» is
 * the caller's `chooseArea`, and «حدّد موقعي على الخريطة» starts the pick and opens the Directory's
 * map (`openMap`). Its states: loading, failed (the reference and a retry), none saved; while the
 * order changes the cards shown stay, marked busy.
 */
export function useFavoritesView({
  chooseArea,
  openMap,
}: {
  chooseArea: () => void;
  openMap: () => void;
}): {
  count: string | undefined;
  near: {
    button: { label: string; on: boolean; locating: boolean; press: () => void };
    status: LocationStatusView;
  };
  state: 'loading' | 'failed' | 'empty' | 'ready';
  cards: SpaceCardView[];
  unlisted: UnlistedFavoriteView[];
  busy: boolean;
  failure: ListFailureView | null;
  empty: { title: string; text: string; browse: string };
  region: string;
} {
  const copy = useCopy();
  const words = copy.favorites.list;
  const english = useLanguage() === 'en';
  const near = useNearMe();
  const point = near.state.sorting ? near.state.point : null;
  const request: FavoritesRequest = point === null ? {} : { near: point };
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  const query = useQuery<FavoriteSpace[], AppError>({
    queryKey: directoryKeys.favorites(request),
    queryFn: () => repository.favorites(request),
    placeholderData: keepPreviousData,
  });
  const answer = query.data;
  const failure = useFailureView(
    answer === undefined ? query.error : null,
    words.loadFailed,
    () => {
      void query.refetch();
    },
  );
  const status = useLocationStatus({
    view: 'list',
    state: near.state,
    stop: near.stop,
    clear: near.clear,
    chooseArea,
    pickOnMap: () => {
      near.startPick();
      openMap();
    },
  });

  const now = new Date();
  const favorites = answer ?? [];
  const cards = favorites.flatMap((favorite) =>
    favorite.listed
      ? [cardViewOf(favorite.space, { english, now, copy, byDistance: point !== null })]
      : [],
  );
  const unlisted = favorites.flatMap((favorite): UnlistedFavoriteView[] =>
    favorite.listed
      ? []
      : [
          {
            key: String(favorite.space.id),
            id: favorite.space.id,
            name: spaceNameOf(favorite.space, english),
            line: words.gone,
          },
        ],
  );

  return {
    count: answer === undefined ? undefined : words.count({ count: favorites.length }),
    near: {
      button: {
        label: copy.directory.near.button,
        on: point !== null,
        locating: near.state.status === 'locating',
        press: near.press,
      },
      status,
    },
    state: query.isPending
      ? 'loading'
      : answer === undefined
        ? 'failed'
        : favorites.length > 0
          ? 'ready'
          : 'empty',
    cards,
    unlisted,
    busy: query.isPlaceholderData,
    failure,
    empty: { title: words.empty.title, text: words.empty.text, browse: copy.site.browseSpaces },
    region: words.region,
  };
}
