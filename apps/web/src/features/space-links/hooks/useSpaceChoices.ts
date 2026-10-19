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
    };
  });

  return {
    search: { value: text, onValueChange: setText },
    loading,
    empty,
    options,
  };
}
