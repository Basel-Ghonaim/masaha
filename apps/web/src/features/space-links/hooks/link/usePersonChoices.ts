import { useCopy } from '@shared/copy';
import { isolate, useLanguage } from '@shared/localisation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { createSpaceLinksRepository } from '../../repository/spaceLinksRepository';
import { userRowView } from '../../services/userRowView';
import type { PersonChoiceView } from '../../types/PersonChoiceView';
import { spaceLinksKeys } from '../queryKeys';
import { usePausedText } from '../usePausedText';

/**
 * The people to link a space to, searched by name or email on the server once typing pauses: up to
 * fifty active accounts, an admin's left out, since an admin is never linked. Each says what it is:
 * an owner with their spaces, an owner whose spaces are all deleted, or a user.
 */
export function usePersonChoices({ enabled }: { enabled: boolean }) {
  const copy = useCopy();
  const words = copy.spaceLinks.choices;
  const lines = copy.spaceLinks.ownersList;
  const english = useLanguage() === 'en';
  const [text, setText] = useState('');
  const paused = usePausedText(text);

  const repository = createSpaceLinksRepository();
  const query = useQuery({
    queryKey: spaceLinksKeys.personChoices(paused === '' ? undefined : paused),
    queryFn: () => repository.personChoices(paused === '' ? undefined : paused),
    enabled,
    placeholderData: keepPreviousData,
  });

  const options: PersonChoiceView[] = (query.data?.data ?? []).flatMap((row) => {
    if (row.role === 'ADMIN') return [];
    const spaces = userRowView(row, { lines, english })
      .spaces.map((space) => isolate(space.text))
      .join(copy.spaceLinks.adminList.separator);
    return [
      {
        value: String(row.id),
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        kind:
          row.role === 'USER'
            ? words.user
            : spaces === ''
              ? words.ownerOfNone
              : words.owner({ spaces }),
      },
    ];
  });

  return {
    search: { value: text, onValueChange: setText },
    loading: query.isFetching ? words.searching : undefined,
    empty: query.isError ? words.searchFailed : words.noResults,
    options,
  };
}
