import type { ManagedSpace } from '@masaha/shared/space-links';
import { useCopy } from '@shared/copy';
import { directionOf, isolate, useLanguage } from '@shared/localisation';
import { useMySpacesQuery } from './useMySpacesQuery';

/** A space as the switcher shows it, in the interface's language. */
function choiceOf(space: ManagedSpace, english: boolean, spaceId: number | undefined) {
  // A space's English name is optional: the English interface then shows the Arabic one, marked as
  // Arabic (docs/frontend/localisation.md › Content in two languages).
  const name = (english ? space.nameEn : null) ?? space.nameAr;
  const nameLanguage = english && space.nameEn === null ? ('ar' as const) : undefined;
  return {
    spaceId: space.spaceId,
    role: space.role,
    name,
    /** The name's language, when it is not the interface's. */
    nameLanguage,
    /** The name's direction, when it is not the interface's. */
    nameDir: nameLanguage && directionOf(nameLanguage),
    area: english ? space.area.nameEn : space.area.nameAr,
    /** The name's first character, the space's mark. */
    initial: Array.from(name)[0] ?? '',
    isCurrent: space.spaceId === spaceId,
  };
}

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
