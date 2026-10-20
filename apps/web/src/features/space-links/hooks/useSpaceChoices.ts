import { useCopy } from '@shared/copy';
import { useState } from 'react';
import { useLanguage } from '@shared/localisation';
import { useQuery } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { createSpaceLinksRepository } from '../repository/spaceLinksRepository';
import { rowView } from '../services/rowView';
import { spaceLinksKeys } from './queryKeys';
import { usePausedText } from './usePausedText';
import type { SpaceChoiceView } from '../types/SpaceChoiceView';

/**
 * The spaces to choose one from, searched on the server once typing pauses: up to fifty, each worded
 * as the spaces list's row. `linked` are the spaces already the person's, and `desks` those whose
 * front desk they work, each offered but not to be chosen.
 */
export function useSpaceChoices({
  enabled,
  linked = [],
  desks = [],
}: {
  enabled: boolean;
  linked?: readonly number[];
  desks?: readonly number[];
}) {
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
  const empty = query.isError
    ? copy.spaceLinks.choices.searchFailed
    : copy.spaceLinks.choices.noResults;

  // Each option is the spaces list's row, by its rules: its name, its state's badges, its owners
  // isolated, so the list and the dialog never word one space two ways.
  const now = new Date();
  const options: SpaceChoiceView[] = (answer?.data ?? []).map((space) => {
    const view = rowView(space, { lines, english, now });
    return {
      value: String(space.id),
      id: space.id,
      name: view.name,
      badges: view.state,
      owners: view.owners ?? lines.noOwner,
      isVerified: space.isVerified,
      linked: linked.includes(space.id),
      atDesk: desks.includes(space.id),
    };
  });

  return {
    search: { value: text, onValueChange: setText },
    loading,
    empty,
    options,
  };
}
