import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';
import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createSpacesRepository } from '../../repository/spacesRepository';
import { useSpaceAnswer } from '../editor/useSpaceAnswer';
import { spaceWriteKey } from '../mutationKeys';

const repository = createSpacesRepository();

/**
 * Confirms a fact group unchanged («المعلومات ما زالت صحيحة»): the server renews its date and
 * answers the space, kept as its state, and a toast says so by the section's name.
 */
export function useConfirmGroup(spaceId: number, group: FactGroup) {
  const answer = useSpaceAnswer(spaceId);
  return useMutation<AdminSpace, AppError>({
    mutationKey: spaceWriteKey(spaceId),
    mutationFn: () => repository.confirm(spaceId, group),
    onSuccess: (space) => {
      answer.keep(space);
      const words = currentCopy().spaces.editor;
      toast(words.section.confirmed({ section: words.sections[group] }));
    },
    onError: answer.refused,
  });
}
