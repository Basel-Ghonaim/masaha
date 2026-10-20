import type { AdminSpace } from '@masaha/shared/spaces';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import type { EditorPlace } from '../../types/EditorPlace';
import { EDITOR_SCOPES } from './editorScope';

/** One space, whole, as the editor at `place` edits it: its profile, its facts and their freshness. */
export function useSpaceQuery(place: EditorPlace, spaceId: number) {
  const scope = EDITOR_SCOPES[place];
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<AdminSpace, AppError>({
    queryKey: scope.spaceKey(spaceId),
    queryFn: () => scope.repository.get(spaceId),
  });
}
