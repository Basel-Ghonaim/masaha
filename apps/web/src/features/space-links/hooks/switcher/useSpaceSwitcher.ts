import { useCopy } from '@shared/copy';
import { isolate, useLanguage } from '@shared/localisation';
import { choiceOf } from '../../services/choiceOf';
import { useMySpacesQuery } from '../useMySpacesQuery';

/**
 * The space switcher, ready to render, for the space in the URL (`spaceId`; none when the URL names
 * no valid space): the user's spaces, the one shown now, whether there is another to choose, the
 * loading and failed states with a retry, and the words.
 */
export function useSpaceSwitcher(spaceId: number | undefined) {
  const copy = useCopy();
  const english = useLanguage() === 'en';
  const query = useMySpacesQuery();
  const spaces = (query.data ?? []).map((space) => choiceOf(space, english, spaceId));
  const current = spaces.find((space) => space.isCurrent);

  return {
    // A failed refetch keeps the spaces already loaded: only a list that never arrived is an error.
    status: query.isPending
      ? ('loading' as const)
      : query.data === undefined
        ? ('error' as const)
        : ('ready' as const),
    spaces,
    current,
    /** A list to open: another space to go to, or the user's spaces when the URL's is not theirs. */
    canSwitch: spaces.length > 1 || (spaces.length === 1 && current === undefined),
    triggerLabel: current
      ? copy.spaceLinks.switchSpace({ name: isolate(current.name) })
      : copy.spaceLinks.chooseSpace,
    chooseLabel: copy.spaceLinks.chooseSpace,
    listLabel: copy.spaceLinks.yourSpaces,
    loadingLabel: copy.status.loading,
    failure: copy.spaceLinks.loadFailed,
    retryLabel: copy.status.retry,
    retry: () => {
      void query.refetch();
    },
  };
}
