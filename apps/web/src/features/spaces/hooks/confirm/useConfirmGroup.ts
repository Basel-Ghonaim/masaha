import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';
import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import type { EditorPlace } from '../../types/EditorPlace';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { useSpaceAnswer } from '../editor/useSpaceAnswer';

/**
 * Confirms a fact group unchanged («المعلومات ما زالت صحيحة»): the server renews its date and
 * answers the space, kept as its state, and a toast says so by the section's name.
 */
export function useConfirmGroup(place: EditorPlace, spaceId: number, group: FactGroup) {
  const scope = EDITOR_SCOPES[place];
  const answer = useSpaceAnswer(place, spaceId);
  return useMutation<AdminSpace, AppError>({
    mutationKey: scope.writeKey(spaceId),
    mutationFn: () => scope.repository.confirm(spaceId, group),
    onSuccess: (space) => {
      answer.keep(space);
      const words = currentCopy().spaces.editor;
      toast(words.section.confirmed({ section: words.sections[group] }));
    },
    onError: answer.refused,
  });
}
