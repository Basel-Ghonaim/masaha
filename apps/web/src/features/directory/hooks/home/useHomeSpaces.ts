import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';
import { useState } from 'react';
import { cardViewOf } from '../../services/cardView';
import type { DirectoryRequest } from '../../types/DirectoryRequest';
import type { HomeSpacesView } from '../../types/HomeSpacesView';
import { useDirectoryQuery } from '../list/useDirectoryQuery';
import { useFailureView } from '../list/useFailureView';
import { useLocationStatus } from '../near/useLocationStatus';
import { useNearMe } from '../near/useNearMe';

/** How many spaces Home shows. */
const HOME_LIMIT = 6;

const OPEN_NOW: DirectoryRequest = { limit: HOME_LIMIT, openNow: true };
const NEAREST: DirectoryRequest = { limit: HOME_LIMIT, sort: 'distance' };

/**
 * Home's spaces, ready to render: six open now, or, while near me sorts by distance from a
 * point, the six nearest it, the point in its header only, titled «المساحات الأقرب إليك» (design
 * issue 37). Near me is the Directory's: one store, one button, one state line; its «اختر منطقتك»
 * is the caller's `chooseArea`, and «حدّد موقعي على الخريطة» starts the pick and opens the
 * Directory's map (`openMap`). «عرض الكل» leads to the Directory listing the same: the spaces
 * open now, or every space, still nearest first. While the other list is on its way, the
 * previous answer stays with its own title (carried 4).
 */
export function useHomeSpaces({
  chooseArea,
  openMap,
}: {
  chooseArea: () => void;
  openMap: () => void;
}): HomeSpacesView {
  const copy = useCopy();
  const words = copy.directory;
  const english = useLanguage() === 'en';
  const near = useNearMe();
  const point = near.state.sorting ? near.state.point : null;
  const nearest = point !== null;
  const query = useDirectoryQuery(nearest ? NEAREST : OPEN_NOW, point);
  const answer = query.data;
  // Which list the shown answer is: the asked one once it has arrived, the previous one until then.
  const [shownNearest, setShownNearest] = useState(nearest);
  if (!query.isPlaceholderData && shownNearest !== nearest) setShownNearest(nearest);
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
  const cards = (answer?.data ?? []).map((space) =>
    cardViewOf(space, { english, now, copy, byDistance: shownNearest }),
  );

  return {
    title: shownNearest ? words.home.nearest : words.home.openNow,
    near: {
      button: {
        label: words.near.button,
        on: nearest,
        locating: near.state.status === 'locating',
        press: near.press,
      },
      status,
    },
    viewAll: { label: words.home.viewAll, to: nearest ? 'list' : 'open' },
    busy: answer !== undefined && query.isFetching,
    state: query.isPending
      ? 'loading'
      : answer === undefined
        ? 'failed'
        : cards.length > 0
          ? 'ready'
          : 'empty',
    cards,
    failure,
    empty: nearest
      ? { title: words.empty.title, text: words.empty.text, action: words.home.empty.action }
      : words.home.empty,
  };
}
