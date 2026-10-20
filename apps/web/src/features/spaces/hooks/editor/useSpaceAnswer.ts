import type { AdminSpace } from '@masaha/shared/spaces';
import type { AppError } from '@shared/errors';
import { useQueryClient } from '@tanstack/react-query';
import type { EditorPlace } from '../../types/EditorPlace';
import { EDITOR_SCOPES } from './editorScope';

/**
 * What a write on a space does with the server's answer. A write answers the whole space, which is
 * the editor's state: it is kept as the space's. The admin's other views, such as the spaces list,
 * are only marked out of date, to be fetched again when shown, so the save waits on nothing more;
 * an owner's own spaces are fetched again now, since the space switcher on the page names the
 * space. A refusal that says the space changed meanwhile (403, 404) fetches the space again, so the
 * page shows it as it is now.
 */
export function useSpaceAnswer(place: EditorPlace, spaceId: number) {
  const client = useQueryClient();
  const scope = EDITOR_SCOPES[place];
  return {
    keep: (space: AdminSpace) => {
      // Marked first, so the answer stored after it stays fresh.
      void client.invalidateQueries({
        queryKey: scope.answered,
        refetchType: place === 'admin' ? 'none' : 'active',
      });
      client.setQueryData(scope.spaceKey(spaceId), space);
    },
    refused: (error: AppError) => {
      if (error.status === 403 || error.status === 404) {
        void client.invalidateQueries({ queryKey: scope.spaceKey(spaceId) });
      }
    },
  };
}
