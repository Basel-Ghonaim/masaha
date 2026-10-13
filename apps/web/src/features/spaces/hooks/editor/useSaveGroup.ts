import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';
import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { spaceWriteKey } from '../mutationKeys';
import { useSpaceAnswer } from './useSpaceAnswer';

/**
 * Saves one fact group of a space with `send`, which answers the whole space: kept as the space's
 * state, and said in a toast that names the section. A refusal is the section's to show.
 */
export function useSaveGroup<Request>(
  spaceId: number,
  group: FactGroup,
  send: (request: Request) => Promise<AdminSpace>,
) {
  const answer = useSpaceAnswer(spaceId);
  return useMutation<AdminSpace, AppError, Request>({
    mutationKey: spaceWriteKey(spaceId),
    mutationFn: send,
    onSuccess: (space) => {
      answer.keep(space);
      // Worded when it lands, in the language the interface speaks then.
      const words = currentCopy().spaces.editor;
      toast(words.section.saved({ section: words.sections[group] }));
    },
    onError: answer.refused,
  });
}
