import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';
import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import type { EditorPlace } from '../../types/EditorPlace';
import { EDITOR_SCOPES } from './editorScope';
import { sectionName } from './sectionName';
import { useSpaceAnswer } from './useSpaceAnswer';

/**
 * Saves one fact group of a space with `send`, which answers the whole space: kept as the space's
 * state, and said in a toast that names the section. A refusal is the section's to show.
 */
export function useSaveGroup<Request>(
  place: EditorPlace,
  spaceId: number,
  group: FactGroup,
  send: (request: Request) => Promise<AdminSpace>,
) {
  const answer = useSpaceAnswer(place, spaceId);
  return useMutation<AdminSpace, AppError, Request>({
    mutationKey: EDITOR_SCOPES[place].writeKey(spaceId),
    mutationFn: send,
    onSuccess: (space) => {
      answer.keep(space);
      // Worded when it lands, in the language the interface speaks then.
      const copy = currentCopy();
      toast(copy.spaces.editor.section.saved({ section: sectionName(place, group, copy) }));
    },
    onError: answer.refused,
  });
}
