import { useCopy } from '@shared/copy';
import { useState } from 'react';
import { useLanguage } from '@shared/localisation';
import { useQuery } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { createSpaceLinksRepository } from '../repository/spaceLinksRepository';
import { spaceLinksKeys } from './queryKeys';
import { usePausedText } from './usePausedText';
import type { SpaceChoiceView } from '../types/SpaceChoiceView';
import type { AdminSpaceRow } from '@masaha/shared/space-links';
import type { Catalogue } from '@shared/copy';

/** A space's name in the interface's language, marked as English when it is the only one. */
function spaceNameOf(space: { nameEn: string; nameAr: string | null }, english: boolean) {
  const arabicName = english ? null : space.nameAr;
  return english || arabicName !== null
    ? { text: arabicName ?? space.nameEn }
    : { text: space.nameEn, lang: 'en' as const, dir: 'ltr' as const };
}

/** The badges of a space's verification and hidden state. */
function spaceBadges(
  space: AdminSpaceRow,
  lines: Catalogue['spaceLinks']['adminList'],
): SpaceChoiceView['badges'] {
  const badges: SpaceChoiceView['badges'] = [];
  if (space.isVerified) badges.push({ label: lines.states.verified, variant: 'success' });
  else badges.push({ label: lines.states.unverified, variant: 'neutral' });
  if (space.isHidden) badges.push({ label: lines.states.hidden, variant: 'neutral' });
  return badges;
}

/** One space offered in the add-owner sheet, in the interface's language. */
function spaceChoiceView(
  space: AdminSpaceRow,
  english: boolean,
  lines: Catalogue['spaceLinks']['adminList'],
): SpaceChoiceView {
  const owners = space.owners.map((owner) => owner.name).join(lines.separator);
  return {
    value: String(space.id),
    id: space.id,
    name: spaceNameOf(space, english),
    badges: spaceBadges(space, lines),
    owners: owners === '' ? lines.noOwner : owners,
    isVerified: space.isVerified,
  };
}

export function useSpaceChoices({ enabled }: { enabled: boolean }) {
  const copy = useCopy();
  const lines = copy.spaceLinks.adminList;
  const english = useLanguage() === 'en';
  const [text, setText] = useState('');
  const paused = usePausedText(text);

  const repository = createSpaceLinksRepository();
  const query = useQuery({
    queryKey: spaceLinksKeys.spaceChoices(paused === '' ? undefined : paused),
    queryFn: () => repository.spaceChoices(paused === '' ? undefined : paused),
    enabled,
    placeholderData: keepPreviousData,
  });

  const answer = query.data;
  const loading = query.isFetching ? copy.spaceLinks.choices.searching : undefined;
  const hasResults = (answer?.data.length ?? 0) > 0;
  const empty = query.isError
    ? copy.spaceLinks.choices.searchFailed
    : hasResults
      ? copy.spaceLinks.choices.noResults
      : copy.spaceLinks.choices.noResults;
  // empty is always noResults/searchFailed text; fine.

  const options: SpaceChoiceView[] = (answer?.data ?? []).map((space) =>
    spaceChoiceView(space, english, lines),
  );

  return {
    search: { value: text, onValueChange: setText },
    loading,
    empty,
    options,
  };
}
